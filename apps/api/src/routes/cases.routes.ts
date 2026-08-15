import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { Prisma, prisma } from '@peopletrackers/db';
import { caseCreateSchema, caseUpdateSchema, caseListQuerySchema, copyTemplateSchema } from '@peopletrackers/shared';
import { buildCaseSearch, caseFilterWhere } from '../lib/case-search.js';
import { computeCreateFields, computeUpdateFields, CASE_UPDATE_LOOKUP_SELECT } from '../domain/case-service.js';
import { attachmentStorage } from '../storage/attachmentStorage.js';

// Matches the bucket's own allowlist (attachmentStorage.ts / the Supabase bucket config) — kept
// here too so a bad upload is rejected with a clear message before it ever reaches Storage.
const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export const CASE_INCLUDE = {
  client: { include: { package: true } },
  agent: true,
  caseType: true,
  status: true,
  package: true,
} satisfies Prisma.CaseInclude;

function filterOrderBy(filter: string, sort?: string): Prisma.CaseOrderByWithRelationInput[] {
  if (sort) {
    const desc = sort.startsWith('-');
    const key = desc ? sort.slice(1) : sort;
    const dir = desc ? 'desc' : 'asc';
    switch (key) {
      case 'client':
        return [{ client: { company: dir } }];
      case 'reference':
        return [{ reference: dir }];
      case 'dateDue':
        return [{ dateDue: dir }];
      case 'status':
        return [{ status: { sortOrder: dir } }];
    }
  }

  // Defaults per §12.2.
  if (filter === 'new_instruction') return [{ dateEntered: 'asc' }];
  if (filter === 'to_report' || filter === 'to_invoice') return [{ status: { sortOrder: 'asc' } }, { dateEntered: 'asc' }];
  return [{ dateEntered: 'desc' }];
}

const casesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/cases', async (request) => {
    const query = caseListQuerySchema.parse(request.query);

    const where: Prisma.CaseWhereInput = {
      ...caseFilterWhere(query.filter),
      ...(query.search ? buildCaseSearch(query.search) : {}),
    };

    const [items, total] = await Promise.all([
      prisma.case.findMany({
        where,
        orderBy: filterOrderBy(query.filter, query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: CASE_INCLUDE,
      }),
      prisma.case.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  });

  fastify.get<{ Params: { id: string } }>('/cases/:id', async (request, reply) => {
    const c = await prisma.case.findUnique({ where: { id: request.params.id }, include: CASE_INCLUDE });
    if (!c) return reply.notFound('Case not found.');
    return c;
  });

  fastify.post('/cases', async (request, reply) => {
    const body = caseCreateSchema.parse(request.body);
    try {
      const data = await computeCreateFields(body, request.authUser?.id);
      const created = await prisma.case.create({ data, include: CASE_INCLUDE });
      return reply.status(201).send(created);
    } catch (err) {
      if (err instanceof Error && err.message === 'Client not found.') {
        return reply.badRequest('Client not found.');
      }
      throw err;
    }
  });

  fastify.put<{ Params: { id: string } }>('/cases/:id', async (request, reply) => {
    const body = caseUpdateSchema.parse(request.body);

    // Only the fields computeUpdateFields actually reads — not the full row plus Client/Agent
    // joins CASE_INCLUDE pulls for the response shape. That fuller shape still gets fetched once,
    // fresh, by the `update` call below.
    const existing = await prisma.case.findUnique({ where: { id: request.params.id }, select: CASE_UPDATE_LOOKUP_SELECT });
    if (!existing) return reply.notFound('Case not found.');

    try {
      const data = await computeUpdateFields(existing, body, request.authUser?.id);
      const updated = await prisma.case.update({ where: { id: request.params.id }, data, include: CASE_INCLUDE });
      return updated;
    } catch (err) {
      if (err instanceof Error && err.message === 'Client not found.') {
        return reply.badRequest('Client not found.');
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return reply.conflict('That case reference is already in use.');
      }
      throw err;
    }
  });

  // Case reference is editable (§6.1) but a separate, narrow endpoint — every other case field
  // goes through the engine in PUT /cases/:id, but reference is a bare unique int with no
  // business-rule computation attached to it.
  fastify.put<{ Params: { id: string }; Body: { reference: number } }>('/cases/:id/reference', async (request, reply) => {
    const { reference } = request.body;
    if (!Number.isInteger(reference) || reference <= 0) {
      return reply.badRequest('Reference must be a positive integer.');
    }
    try {
      const updated = await prisma.case.update({
        where: { id: request.params.id },
        data: { reference, updatedBy: request.authUser?.id },
        include: CASE_INCLUDE,
      });
      return updated;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return reply.notFound('Case not found.');
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return reply.conflict('That case reference is already in use.');
      }
      throw err;
    }
  });

  fastify.delete<{ Params: { id: string }; Querystring: { force?: string } }>('/cases/:id', async (request, reply) => {
    const force = request.query.force === 'true';

    // case_attachments.case_id is ON DELETE CASCADE (schema.prisma) — the DB rows go
    // automatically with the case. The files in Supabase Storage don't, so their keys are
    // grabbed before the delete and cleaned up (best-effort) after it succeeds.
    const attachments = await prisma.caseAttachment.findMany({
      where: { caseId: request.params.id },
      select: { storageKey: true },
    });

    try {
      if (force) {
        // Admin-only override — deletes the email/document audit trail along with the case
        // itself. The restriction below is a safety net against accidental deletion, not an
        // absolute wall; an admin who genuinely means to remove a case gets to.
        if (request.authUser?.role !== 'admin') {
          return reply.forbidden('Only an admin can force-delete a case with an emailed-report history.');
        }
        await prisma.$transaction([
          prisma.emailLog.deleteMany({ where: { caseId: request.params.id } }),
          prisma.generatedDocument.deleteMany({ where: { caseId: request.params.id } }),
          prisma.case.delete({ where: { id: request.params.id } }),
        ]);
      } else {
        await prisma.case.delete({ where: { id: request.params.id } });
      }
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return reply.notFound('Case not found.');
      }
      // generated_documents.caseId is ON DELETE RESTRICT (schema.prisma) — a case with an
      // emailed-report history can't be deleted without ?force=true (admin-only, above).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        return reply.conflict('This case has an emailed report on file and cannot be deleted.');
      }
      throw err;
    }
    await Promise.all(
      attachments.map((a) => attachmentStorage.remove(a.storageKey).catch((err) => request.log.warn({ err }, 'Failed to remove attachment file after case delete'))),
    );
    return reply.status(204).send();
  });

  // Case attachments (screenshots/PDFs uploaded onto a case, distinct from generated reports).
  fastify.get<{ Params: { id: string } }>('/cases/:id/attachments', async (request, reply) => {
    const exists = await prisma.case.findUnique({ where: { id: request.params.id }, select: { id: true } });
    if (!exists) return reply.notFound('Case not found.');
    return prisma.caseAttachment.findMany({
      where: { caseId: request.params.id },
      orderBy: { uploadedAt: 'desc' },
      select: { id: true, filename: true, mimeType: true, sizeBytes: true, uploadedAt: true, uploadedBy: true },
    });
  });

  fastify.post<{ Params: { id: string } }>('/cases/:id/attachments', async (request, reply) => {
    const exists = await prisma.case.findUnique({ where: { id: request.params.id }, select: { id: true } });
    if (!exists) return reply.notFound('Case not found.');

    const file = await request.file({ limits: { fileSize: MAX_ATTACHMENT_BYTES } });
    if (!file) return reply.badRequest('No file uploaded.');
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.mimetype)) {
      return reply.badRequest('Only images (PNG/JPEG/GIF/WEBP/HEIC) and PDFs can be attached.');
    }

    const content = await file.toBuffer();
    if (file.file.truncated) {
      return reply.status(413).send({ statusCode: 413, error: 'Payload Too Large', message: 'Attachments are limited to 20MB.' });
    }

    const storageKey = `${request.params.id}/${randomUUID()}-${file.filename}`;
    await attachmentStorage.save(storageKey, content, file.mimetype);

    const attachment = await prisma.caseAttachment.create({
      data: {
        caseId: request.params.id,
        filename: file.filename,
        mimeType: file.mimetype,
        sizeBytes: content.length,
        storageKey,
        uploadedBy: request.authUser?.id,
      },
      select: { id: true, filename: true, mimeType: true, sizeBytes: true, uploadedAt: true, uploadedBy: true },
    });
    return reply.status(201).send(attachment);
  });

  fastify.get<{ Params: { id: string; attachmentId: string } }>('/cases/:id/attachments/:attachmentId', async (request, reply) => {
    const attachment = await prisma.caseAttachment.findFirst({
      where: { id: request.params.attachmentId, caseId: request.params.id },
    });
    if (!attachment) return reply.notFound('Attachment not found.');
    const content = await attachmentStorage.read(attachment.storageKey);
    reply.header('Content-Type', attachment.mimeType);
    reply.header('Content-Disposition', `inline; filename="${attachment.filename}"`);
    return reply.send(content);
  });

  fastify.delete<{ Params: { id: string; attachmentId: string } }>('/cases/:id/attachments/:attachmentId', async (request, reply) => {
    const attachment = await prisma.caseAttachment.findFirst({
      where: { id: request.params.attachmentId, caseId: request.params.id },
    });
    if (!attachment) return reply.notFound('Attachment not found.');
    await prisma.caseAttachment.delete({ where: { id: attachment.id } });
    await attachmentStorage.remove(attachment.storageKey).catch((err) => request.log.warn({ err }, 'Failed to remove attachment file'));
    return reply.status(204).send();
  });

  // §6.7 — copy a report template body into the case's Report field.
  fastify.post<{ Params: { id: string } }>('/cases/:id/copy-template', async (request, reply) => {
    const body = copyTemplateSchema.parse(request.body);

    const existing = await prisma.case.findUnique({ where: { id: request.params.id } });
    if (!existing) return reply.notFound('Case not found.');

    if (existing.report && existing.report.trim() !== '' && !body.confirmReplace) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Report already has content. Confirm to replace it.',
        requiresConfirmation: true,
      });
    }

    const template = await prisma.reportTemplate.findUnique({ where: { code: body.templateCode } });
    if (!template) return reply.notFound('Report template not found.');

    const updated = await prisma.case.update({
      where: { id: request.params.id },
      data: { report: template.body, updatedBy: request.authUser?.id },
      include: CASE_INCLUDE,
    });
    return updated;
  });
};

export default casesRoutes;
