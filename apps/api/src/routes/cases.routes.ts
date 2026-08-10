import type { FastifyPluginAsync } from 'fastify';
import { Prisma, prisma } from '@peopletrackers/db';
import { caseCreateSchema, caseUpdateSchema, caseListQuerySchema, copyTemplateSchema } from '@peopletrackers/shared';
import { buildCaseSearch, caseFilterWhere } from '../lib/case-search.js';
import { computeCreateFields, computeUpdateFields } from '../domain/case-service.js';

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

    const existing = await prisma.case.findUnique({ where: { id: request.params.id }, include: CASE_INCLUDE });
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

  fastify.delete<{ Params: { id: string } }>('/cases/:id', async (request, reply) => {
    try {
      await prisma.case.delete({ where: { id: request.params.id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return reply.notFound('Case not found.');
      }
      // generated_documents.caseId is ON DELETE RESTRICT (schema.prisma) — a case with an
      // emailed-report history can't be deleted, same protection as client/agent delete.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        return reply.conflict('This case has an emailed report on file and cannot be deleted.');
      }
      throw err;
    }
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
