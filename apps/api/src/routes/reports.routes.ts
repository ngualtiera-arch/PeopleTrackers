import type { FastifyPluginAsync } from 'fastify';
import JSZip from 'jszip';
import { prisma } from '@peopletrackers/db';
import { renderPdf } from '../reports/render.js';
import { loadCompanySettings, buildLetterheadHeader, buildLetterheadFooter, buildAgentInstructionHeader } from '../reports/layout.js';
import { buildBeginsWithSearch } from '../lib/search.js';
import { buildCaseSearch, caseFilterWhere } from '../lib/case-search.js';
import { CASE_INCLUDE } from './cases.routes.js';
import { clientDetailsTemplate } from '../reports/templates/clientDetails.js';
import { clientListTemplate } from '../reports/templates/clientList.js';
import { clientEnvelopeTemplate } from '../reports/templates/clientEnvelope.js';
import { agentDetailsTemplate } from '../reports/templates/agentDetails.js';
import { agentListTemplate } from '../reports/templates/agentList.js';
import { agentEnvelopeTemplate } from '../reports/templates/agentEnvelope.js';
import { caseReportTemplate } from '../reports/templates/caseReport.js';
import { updateReportTemplate } from '../reports/templates/updateReport.js';
import { agentInstructionTemplate } from '../reports/templates/agentInstruction.js';
import { clientStatusReportTemplate } from '../reports/templates/clientStatusReport.js';
import { fileListByAgentTemplate } from '../reports/templates/fileListByAgent.js';
import { toCsv } from '../lib/csv.js';

const CLIENT_SEARCH_FIELDS = ['company', 'contactName', 'kind', 'email', 'phone', 'city', 'state'];
const AGENT_SEARCH_FIELDS = ['name', 'company', 'email', 'phone', 'city', 'state'];

function sendPdf(reply: import('fastify').FastifyReply, pdf: Buffer, filename: string) {
  reply.header('Content-Type', 'application/pdf');
  reply.header('Content-Disposition', `inline; filename="${filename}"`);
  return reply.send(pdf);
}

function sendCsv(reply: import('fastify').FastifyReply, csv: string, filename: string) {
  reply.header('Content-Type', 'text/csv; charset=utf-8');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  return reply.send(csv);
}

function subjectFullName(c: { subjectFirstname: string | null; subjectMiddlename: string | null; subjectLastname: string | null }): string {
  return [c.subjectFirstname, c.subjectMiddlename, c.subjectLastname].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

const reportsRoutes: FastifyPluginAsync = async (fastify) => {
  // Client List — result-set scope, reproduces the current Find/needs-review filter (§13.2 #7).
  fastify.get<{ Querystring: { search?: string; needsReview?: string } }>('/clients/report/list', async (request, reply) => {
    const { search, needsReview } = request.query;
    const clients = await prisma.client.findMany({
      where: {
        ...(needsReview === 'true' ? { needsReview: true } : {}),
        ...(search ? buildBeginsWithSearch(search, CLIENT_SEARCH_FIELDS) : {}),
      },
      orderBy: { company: 'asc' },
    });

    const settings = await loadCompanySettings();
    const pdf = await renderPdf(clientListTemplate(clients), {
      headerHtml: buildLetterheadHeader(settings),
      footerHtml: buildLetterheadFooter(settings),
    });
    return sendPdf(reply, pdf, 'CLIENTS.pdf');
  });

  // Client Details / Client Envelope — single-record scope (§13.2 #6, #8).
  fastify.get<{ Params: { id: string }; Querystring: { type?: string } }>('/clients/:id/report', async (request, reply) => {
    const client = await prisma.client.findUnique({ where: { id: request.params.id }, include: { package: true } });
    if (!client) return reply.notFound('Client not found.');

    const settings = await loadCompanySettings();
    const filenameBase = (client.company ?? client.contactName ?? `client_${client.reference}`).toUpperCase().replace(/\s+/g, '_');

    if (request.query.type === 'envelope') {
      const pdf = await renderPdf(clientEnvelopeTemplate(client, settings), { format: 'envelope-dl' });
      return sendPdf(reply, pdf, `${filenameBase}_envelope.pdf`);
    }

    const pdf = await renderPdf(clientDetailsTemplate(client), {
      headerHtml: buildLetterheadHeader(settings),
      footerHtml: buildLetterheadFooter(settings),
    });
    return sendPdf(reply, pdf, `${filenameBase}_details.pdf`);
  });

  // Agent List — result-set scope (§13.2 #10).
  fastify.get<{ Querystring: { search?: string; needsReview?: string } }>('/agents/report/list', async (request, reply) => {
    const { search, needsReview } = request.query;
    const agents = await prisma.agent.findMany({
      where: {
        ...(needsReview === 'true' ? { needsReview: true } : {}),
        ...(search ? buildBeginsWithSearch(search, AGENT_SEARCH_FIELDS) : {}),
      },
      orderBy: { name: 'asc' },
    });

    const settings = await loadCompanySettings();
    const pdf = await renderPdf(agentListTemplate(agents), {
      headerHtml: buildLetterheadHeader(settings),
      footerHtml: buildLetterheadFooter(settings),
    });
    return sendPdf(reply, pdf, 'AGENTS.pdf');
  });

  // Agent Details / Agent Envelope — single-record scope (§13.2 #9, #11).
  fastify.get<{ Params: { id: string }; Querystring: { type?: string } }>('/agents/:id/report', async (request, reply) => {
    const agent = await prisma.agent.findUnique({ where: { id: request.params.id }, include: { skills: true } });
    if (!agent) return reply.notFound('Agent not found.');

    const settings = await loadCompanySettings();
    const filenameBase = (agent.name ?? `agent_${agent.reference}`).toUpperCase().replace(/\s+/g, '_');

    if (request.query.type === 'envelope') {
      const pdf = await renderPdf(agentEnvelopeTemplate(agent, settings), { format: 'envelope-dl' });
      return sendPdf(reply, pdf, `${filenameBase}_envelope.pdf`);
    }

    const pdf = await renderPdf(agentDetailsTemplate(agent), {
      headerHtml: buildLetterheadHeader(settings),
      footerHtml: buildLetterheadFooter(settings),
    });
    return sendPdf(reply, pdf, `${filenameBase}_details.pdf`);
  });

  // Case Report / File Update / Agent Instruction — single-record scope (§13.2 #1-3).
  fastify.get<{ Params: { id: string }; Querystring: { type?: string } }>('/cases/:id/report', async (request, reply) => {
    const c = await prisma.case.findUnique({ where: { id: request.params.id }, include: CASE_INCLUDE });
    if (!c) return reply.notFound('Case not found.');

    const settings = await loadCompanySettings();
    const subjectName = [c.subjectFirstname, c.subjectLastname].filter(Boolean).join(' ').trim() || `case_${c.reference}`;
    const filenameBase = `${(c.client.company ?? 'CLIENT').toUpperCase().replace(/\s+/g, '_')}_${subjectName.toLowerCase().replace(/\s+/g, '_')}`;

    if (request.query.type === 'update_report') {
      const pdf = await renderPdf(updateReportTemplate(c), {
        headerHtml: buildLetterheadHeader(settings),
        footerHtml: buildLetterheadFooter(settings),
      });
      return sendPdf(reply, pdf, `${filenameBase}_update.pdf`);
    }

    if (request.query.type === 'agent_instruction') {
      // Hard requirement (§9.4): no client identifying information anywhere on this document.
      const pdf = await renderPdf(agentInstructionTemplate(c), {
        headerHtml: buildAgentInstructionHeader(settings),
        footerHtml: buildLetterheadFooter(settings),
      });
      return sendPdf(reply, pdf, `${filenameBase}_agent_instruction.pdf`);
    }

    const pdf = await renderPdf(caseReportTemplate(c), {
      headerHtml: buildLetterheadHeader(settings),
      footerHtml: buildLetterheadFooter(settings),
    });
    return sendPdf(reply, pdf, `${filenameBase}.pdf`);
  });

  // Client Status Report / File List by Agent — result-set scope (§13.2 #4, #5).
  // `format=csv` (raw export, matching the source's "Save as Excel" print-preview option —
  // confirmed from a recording of the live FileMaker system) returns the same rows as CSV
  // instead of PDF.
  fastify.get<{ Querystring: { filter?: string; search?: string; format?: string } }>('/cases/report/client-status', async (request, reply) => {
    const cases = await prisma.case.findMany({
      where: {
        ...caseFilterWhere(request.query.filter ?? 'all'),
        ...(request.query.search ? buildCaseSearch(request.query.search) : {}),
      },
      include: CASE_INCLUDE,
      orderBy: [{ status: { sortOrder: 'asc' } }, { dateEntered: 'asc' }], // §13.3: sorted by Status, then Date Entered
    });

    if (request.query.format === 'csv') {
      const csv = toCsv(
        ['Date Entered', 'Client', 'Client Ref.', 'Subject', 'Type', 'Date Closed', 'Our Ref.'],
        cases.map((c) => [
          c.dateEntered ? new Date(c.dateEntered).toLocaleDateString('en-AU') : '',
          c.client.company,
          c.clientRef,
          subjectFullName(c).toUpperCase(),
          c.caseType.name,
          c.dateClosed ? new Date(c.dateClosed).toLocaleDateString('en-AU') : '',
          c.reference,
        ]),
      );
      return sendCsv(reply, csv, 'Client_Status_Report.csv');
    }

    const settings = await loadCompanySettings();
    const pdf = await renderPdf(clientStatusReportTemplate(cases, settings.logoUrl));
    return sendPdf(reply, pdf, 'Client_Status_Report.pdf');
  });

  fastify.get<{ Querystring: { filter?: string; search?: string; format?: string } }>('/cases/report/file-list-by-agent', async (request, reply) => {
    const cases = await prisma.case.findMany({
      where: {
        ...caseFilterWhere(request.query.filter ?? 'all'),
        ...(request.query.search ? buildCaseSearch(request.query.search) : {}),
      },
      include: CASE_INCLUDE,
      // §13.3: sorted by Agent, then Status, then Date Entered.
      orderBy: [{ agent: { name: 'asc' } }, { status: { sortOrder: 'asc' } }, { dateEntered: 'asc' }],
    });

    if (request.query.format === 'csv') {
      const csv = toCsv(
        ['ID', 'Client', 'Client Ref.', 'Subject', 'Package', 'Agent', 'Status', 'Due'],
        cases.map((c) => [
          c.reference,
          c.client.company,
          c.clientRef,
          subjectFullName(c).toUpperCase(),
          c.package?.name ?? '',
          c.agent?.name ?? '',
          c.status.name,
          c.dateDue ? new Date(c.dateDue).toLocaleDateString('en-AU') : '',
        ]),
      );
      return sendCsv(reply, csv, 'File_List.csv');
    }

    const pdf = await renderPdf(fileListByAgentTemplate(cases));
    return sendPdf(reply, pdf, 'File_List.pdf');
  });

  // Batch PDF — spec §13.6. Renders the Case Report for every case in the current filtered
  // set, sorted by client, and marks every case in that set report_sent = true.
  fastify.post<{ Body: { filter?: string; search?: string } }>('/cases/report/batch', async (request, reply) => {
    const filter = request.body?.filter ?? 'all';
    const search = request.body?.search;
    const where = {
      ...caseFilterWhere(filter),
      ...(search ? buildCaseSearch(search) : {}),
    };

    const cases = await prisma.case.findMany({
      where,
      include: CASE_INCLUDE,
      orderBy: { client: { company: 'asc' } },
    });

    if (cases.length === 0) {
      return reply.badRequest('No cases in the current set.');
    }

    const settings = await loadCompanySettings();
    const zip = new JSZip();
    const usedNames = new Set<string>();

    for (const c of cases) {
      const pdf = await renderPdf(caseReportTemplate(c), {
        headerHtml: buildLetterheadHeader(settings),
        footerHtml: buildLetterheadFooter(settings),
      });

      const subjectName = [c.subjectFirstname, c.subjectLastname].filter(Boolean).join(' ').trim() || `case_${c.reference}`;
      let filename = `${(c.client.company ?? 'CLIENT').toUpperCase().replace(/\s+/g, '_')}_${subjectName.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      if (usedNames.has(filename)) {
        filename = `${filename.replace(/\.pdf$/, '')}_${c.reference}.pdf`;
      }
      usedNames.add(filename);

      zip.file(filename, pdf);
    }

    await prisma.case.updateMany({
      where: { id: { in: cases.map((c) => c.id) } },
      data: { reportSent: true },
    });

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="batch_${new Date().toISOString().slice(0, 10)}.zip"`);
    return reply.send(zipBuffer);
  });
};

export default reportsRoutes;
