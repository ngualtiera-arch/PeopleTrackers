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
  // Not admin-gated, unlike everything else here — the logo is UI chrome every signed-in user
  // sees (Main Menu), not a business setting, so it can't require the admin role /settings does.
  fastify.get('/settings/branding', async () => {
    const row = await prisma.setting.findUnique({ where: { key: 'company' } });
    const value = row?.value as { logoUrl?: string | null } | undefined;
    return { logoUrl: value?.logoUrl ?? null };
  });

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

  const SEQUENCE_INFO: Record<string, { sequence: string; table: string; column: string }> = {
    case: { sequence: 'cases_reference_seq', table: 'cases', column: 'reference' },
    client: { sequence: 'clients_reference_seq', table: 'clients', column: 'reference' },
    agent: { sequence: 'agents_reference_seq', table: 'agents', column: 'reference' },
  };

  async function nextSequenceValue(sequence: string): Promise<number> {
    // last_value alone is ambiguous — after a fresh RESTART WITH, is_called is false and
    // last_value already IS the next value to be handed out; after any real nextval() call,
    // is_called is true and the next value is last_value + 1.
    const [row] = await prisma.$queryRawUnsafe<{ last_value: bigint; is_called: boolean }[]>(
      `select last_value, is_called from ${sequence}`,
    );
    return row.is_called ? Number(row.last_value) + 1 : Number(row.last_value);
  }

  // Current "next" value of each reference sequence (§9.10, §8.6) — read-only display.
  fastify.get('/settings/sequences', { preHandler: fastify.requireRole('admin') }, async () => {
    const [caseReference, clientReference, agentReference] = await Promise.all([
      nextSequenceValue('cases_reference_seq'),
      nextSequenceValue('clients_reference_seq'),
      nextSequenceValue('agents_reference_seq'),
    ]);
    return { caseReference, clientReference, agentReference };
  });

  const setSequenceSchema = z.object({ nextValue: z.number().int().positive() });

  // Admin override — e.g. migrating go-live to continue exactly where the old FileMaker system
  // left off, not wherever this build happened to seed to. Guarded against setting a value that
  // would collide with a reference number already in use.
  fastify.put<{ Params: { type: string } }>('/settings/sequences/:type', { preHandler: fastify.requireRole('admin') }, async (request, reply) => {
    const info = SEQUENCE_INFO[request.params.type];
    if (!info) return reply.notFound('Unknown sequence type.');

    const { nextValue } = setSequenceSchema.parse(request.body);

    const [{ max }] = await prisma.$queryRawUnsafe<{ max: number | null }[]>(
      `select max(${info.column}) as max from ${info.table}`,
    );
    if (max !== null && nextValue <= max) {
      return reply.badRequest(`That would collide with an existing reference (${max} is already in use). Choose a value greater than ${max}.`);
    }

    await prisma.$executeRawUnsafe(`alter sequence ${info.sequence} restart with ${nextValue}`);
    return { nextValue };
  });
};

export default settingsRoutes;
