import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@peopletrackers/db';
import { prisma } from '@peopletrackers/db';
import { agentCreateSchema, agentUpdateSchema, agentListQuerySchema } from '@peopletrackers/shared';
import { buildBeginsWithSearch } from '../lib/search.js';

// Spec §12.1 — Agent list Find fields.
const AGENT_SEARCH_FIELDS = ['name', 'company', 'email', 'phone', 'city', 'state'];

const agentsRoutes: FastifyPluginAsync = async (fastify) => {
  // §9.7 Agents list — Name, Company, Address, Phone, Fax, Email; needs-review filter.
  fastify.get('/agents', async (request) => {
    const query = agentListQuerySchema.parse(request.query);

    const where: Prisma.AgentWhereInput = {
      ...(query.needsReview !== undefined ? { needsReview: query.needsReview } : {}),
      ...(query.search ? buildBeginsWithSearch(query.search, AGENT_SEARCH_FIELDS) : {}),
    };

    const [items, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { skills: true },
      }),
      prisma.agent.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  });

  fastify.get<{ Params: { id: string } }>('/agents/:id', async (request, reply) => {
    const agent = await prisma.agent.findUnique({
      where: { id: request.params.id },
      include: { skills: true },
    });
    if (!agent) return reply.notFound('Agent not found.');
    return agent;
  });

  fastify.post('/agents', async (request, reply) => {
    const body = agentCreateSchema.parse(request.body);

    const agent = await prisma.agent.create({
      data: {
        name: body.name,
        company: body.company,
        addr1: body.addr1,
        addr2: body.addr2,
        city: body.city,
        state: body.state,
        postcode: body.postcode,
        country: body.country,
        phone: body.phone,
        mobile: body.mobile,
        fax: body.fax,
        email: body.email,
        notes: body.notes,
        rate: body.rate,
        createdBy: request.authUser?.id,
        updatedBy: request.authUser?.id,
        skills: { create: body.skills.map((skill) => ({ skill })) },
      },
      include: { skills: true },
    });

    return reply.status(201).send(agent);
  });

  fastify.put<{ Params: { id: string } }>('/agents/:id', async (request, reply) => {
    const body = agentUpdateSchema.parse(request.body);

    const existing = await prisma.agent.findUnique({ where: { id: request.params.id } });
    if (!existing) return reply.notFound('Agent not found.');

    const { skills, ...fields } = body;

    const agent = await prisma.agent.update({
      where: { id: request.params.id },
      data: {
        ...fields,
        updatedBy: request.authUser?.id,
        ...(skills !== undefined
          ? {
              skills: {
                deleteMany: {},
                create: skills.map((skill) => ({ skill })),
              },
            }
          : {}),
      },
      include: { skills: true },
    });

    return agent;
  });

  fastify.delete<{ Params: { id: string } }>('/agents/:id', async (request, reply) => {
    try {
      await prisma.agent.delete({ where: { id: request.params.id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return reply.notFound('Agent not found.');
      }
      // Case.agentId is ON DELETE RESTRICT — spec: "refused with a clear message" once cases exist (Phase 3).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        return reply.conflict('This agent has cases and cannot be deleted.');
      }
      throw err;
    }
    return reply.status(204).send();
  });
};

export default agentsRoutes;
