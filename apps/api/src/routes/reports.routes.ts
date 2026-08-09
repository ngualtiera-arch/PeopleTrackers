import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@peopletrackers/db';
import { renderPdf } from '../reports/render.js';
import { loadCompanySettings, buildLetterheadHeader, buildLetterheadFooter } from '../reports/layout.js';
import { buildBeginsWithSearch } from '../lib/search.js';
import { clientDetailsTemplate } from '../reports/templates/clientDetails.js';
import { clientListTemplate } from '../reports/templates/clientList.js';
import { clientEnvelopeTemplate } from '../reports/templates/clientEnvelope.js';
import { agentDetailsTemplate } from '../reports/templates/agentDetails.js';
import { agentListTemplate } from '../reports/templates/agentList.js';
import { agentEnvelopeTemplate } from '../reports/templates/agentEnvelope.js';

const CLIENT_SEARCH_FIELDS = ['company', 'contactName', 'kind', 'email', 'phone', 'city', 'state'];
const AGENT_SEARCH_FIELDS = ['name', 'company', 'email', 'phone', 'city', 'state'];

function sendPdf(reply: import('fastify').FastifyReply, pdf: Buffer, filename: string) {
  reply.header('Content-Type', 'application/pdf');
  reply.header('Content-Disposition', `inline; filename="${filename}"`);
  return reply.send(pdf);
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
};

export default reportsRoutes;
