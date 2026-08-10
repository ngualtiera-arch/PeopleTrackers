import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@peopletrackers/db';
import { CASE_INCLUDE } from './cases.routes.js';
import { loadEmailSettings } from '../lib/settings.js';
import { defaultReportRecipient, defaultReportEmail, defaultAgentInstructionEmail } from '../domain/email-templates.js';
import { renderPdf } from '../reports/render.js';
import { buildLetterheadHeader, buildLetterheadFooter, loadCompanySettings } from '../reports/layout.js';
import { caseReportTemplate } from '../reports/templates/caseReport.js';
import { updateReportTemplate } from '../reports/templates/updateReport.js';
import { emailTransport } from '../email/transport.js';
import { documentStorage } from '../storage/instance.js';

const sendReportSchema = z.object({
  reportType: z.enum(['case_report', 'update_report']),
  recipient: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});

const sendInstructionSchema = z.object({
  recipient: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});

const emailRoutes: FastifyPluginAsync = async (fastify) => {
  // §14.1 — defaults for the report-to-client compose modal.
  fastify.get<{ Params: { id: string }; Querystring: { reportType?: string } }>(
    '/cases/:id/email/report-defaults',
    async (request, reply) => {
      const c = await prisma.case.findUnique({ where: { id: request.params.id }, include: CASE_INCLUDE });
      if (!c) return reply.notFound('Case not found.');

      const settings = await loadEmailSettings();
      const { subject, body } = defaultReportEmail(c, settings);
      return { recipient: defaultReportRecipient(c), subject, body };
    },
  );

  // §14.1 — compose → confirm → send → record. Attaches the generated report PDF and stores it
  // (§13.5: only emailed PDFs are stored). Does not touch report_sent — that stays a manual
  // checkbox (§2.5).
  fastify.post<{ Params: { id: string } }>('/cases/:id/email/report', async (request, reply) => {
    const body = sendReportSchema.parse(request.body);
    const c = await prisma.case.findUnique({ where: { id: request.params.id }, include: CASE_INCLUDE });
    if (!c) return reply.notFound('Case not found.');

    const settings = await loadCompanySettings();
    const template = body.reportType === 'update_report' ? updateReportTemplate : caseReportTemplate;
    const pdf = await renderPdf(template(c), {
      headerHtml: buildLetterheadHeader(settings),
      footerHtml: buildLetterheadFooter(settings),
    });

    const subjectName = [c.subjectFirstname, c.subjectLastname].filter(Boolean).join(' ').trim() || `case_${c.reference}`;
    const filename = `${(c.client.company ?? 'CLIENT').toUpperCase().replace(/\s+/g, '_')}_${subjectName.toLowerCase().replace(/\s+/g, '_')}.pdf`;
    const storageKey = `${randomUUID()}.pdf`;
    await documentStorage.save(storageKey, pdf);

    const document = await prisma.generatedDocument.create({
      data: {
        caseId: c.id,
        kind: body.reportType,
        filename,
        storageKey,
        generatedBy: request.authUser?.id,
      },
    });

    const result = await emailTransport.send({
      to: body.recipient,
      subject: body.subject,
      body: body.body,
      attachment: { filename, content: pdf, contentType: 'application/pdf' },
    });

    const log = await prisma.emailLog.create({
      data: {
        caseId: c.id,
        documentId: document.id,
        toAddress: body.recipient,
        subject: body.subject,
        body: body.body,
        providerMessageId: result.providerMessageId,
        status: result.status,
        sentAt: result.status === 'sent' ? new Date() : null,
        sentBy: request.authUser?.id,
        error: result.error,
      },
    });

    return log;
  });

  // §14.2 — defaults for the agent instruction compose modal.
  fastify.get<{ Params: { id: string } }>('/cases/:id/email/agent-instruction-defaults', async (request, reply) => {
    const c = await prisma.case.findUnique({ where: { id: request.params.id }, include: CASE_INCLUDE });
    if (!c) return reply.notFound('Case not found.');
    if (!c.agent) return reply.badRequest('This case has no agent assigned.');

    const settings = await loadEmailSettings();
    const { subject, body } = defaultAgentInstructionEmail(c, settings);
    return { recipient: c.agent.email ?? '', subject, body };
  });

  // §14.2 / D12 — no attachment. On success: stamp date_instruction_sent and record email_log.
  fastify.post<{ Params: { id: string } }>('/cases/:id/email/agent-instruction', async (request, reply) => {
    const body = sendInstructionSchema.parse(request.body);
    const c = await prisma.case.findUnique({ where: { id: request.params.id } });
    if (!c) return reply.notFound('Case not found.');

    const result = await emailTransport.send({
      to: body.recipient,
      subject: body.subject,
      body: body.body,
    });

    const [log] = await prisma.$transaction([
      prisma.emailLog.create({
        data: {
          caseId: c.id,
          toAddress: body.recipient,
          subject: body.subject,
          body: body.body,
          providerMessageId: result.providerMessageId,
          status: result.status,
          sentAt: result.status === 'sent' ? new Date() : null,
          sentBy: request.authUser?.id,
          error: result.error,
        },
      }),
      ...(result.status === 'sent'
        ? [prisma.case.update({ where: { id: c.id }, data: { dateInstructionSent: new Date(), updatedBy: request.authUser?.id } })]
        : []),
    ]);

    return log;
  });

  // Every email sent on a case — for the "send is recorded and visible on the case" acceptance criterion.
  fastify.get<{ Params: { id: string } }>('/cases/:id/email-log', async (request) => {
    return prisma.emailLog.findMany({ where: { caseId: request.params.id }, orderBy: { id: 'desc' } });
  });
};

export default emailRoutes;
