import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@peopletrackers/db';

const companySchema = z.object({
  legalName: z.string(),
  tradingAs: z.string(),
  abn: z.string(),
  secondaryAbn: z.string(),
  acn: z.string(),
  email: z.string(),
  website: z.string(),
  additionalWebsite: z.string(),
  postalAddress: z.string(),
  contactNumber: z.string(),
  confidentialityLine: z.string(),
  officeByAppointmentLine: z.string(),
  logoUrl: z.string().nullable(),
});

const defaultsSchema = z.object({
  defaultAgentId: z.string().uuid().nullable(),
  defaultCaseType: z.string(),
  defaultStatus: z.string(),
  daysUntilDue: z.number().int().positive(),
});

const emailSettingsSchema = z.object({
  provider: z.string().nullable(),
  sendingDomain: z.string().nullable(),
  fromAddress: z.string().nullable(),
  replyTo: z.string().nullable(),
  reportEmailSubject: z.string(),
  reportEmailBody: z.string(),
  agentInstructionSubject: z.string(),
  agentInstructionBody: z.string(),
});

const SETTINGS_SCHEMAS: Record<string, z.ZodTypeAny> = {
  company: companySchema,
  defaults: defaultsSchema,
  email: emailSettingsSchema,
};

/** Settings — Admin only (§9.10, §15). */
const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/settings', { preHandler: fastify.requireRole('admin') }, async () => {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  });

  fastify.put<{ Params: { key: string } }>('/settings/:key', { preHandler: fastify.requireRole('admin') }, async (request, reply) => {
    const schema = SETTINGS_SCHEMAS[request.params.key];
    if (!schema) return reply.notFound('Unknown settings key.');

    const value = schema.parse(request.body);
    const row = await prisma.setting.upsert({
      where: { key: request.params.key },
      update: { value },
      create: { key: request.params.key, value },
    });
    return row;
  });

  // Read-only reference data (§7: "read-only in V1") — packages/rates, case types, statuses.
  fastify.get('/settings/reference-data', { preHandler: fastify.requireRole('admin') }, async () => {
    const [packages, caseTypes, caseStatuses] = await Promise.all([
      prisma.package.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.caseType.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.caseStatus.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    return { packages, caseTypes, caseStatuses };
  });

  // Current value of each reference sequence (§9.10, §8.6) — read-only display.
  fastify.get('/settings/sequences', { preHandler: fastify.requireRole('admin') }, async () => {
    const [cases, clients, agents] = await Promise.all([
      prisma.$queryRawUnsafe<{ last_value: bigint }[]>('select last_value from cases_reference_seq'),
      prisma.$queryRawUnsafe<{ last_value: bigint }[]>('select last_value from clients_reference_seq'),
      prisma.$queryRawUnsafe<{ last_value: bigint }[]>('select last_value from agents_reference_seq'),
    ]);
    return {
      caseReference: Number(cases[0].last_value),
      clientReference: Number(clients[0].last_value),
      agentReference: Number(agents[0].last_value),
    };
  });
};

export default settingsRoutes;
