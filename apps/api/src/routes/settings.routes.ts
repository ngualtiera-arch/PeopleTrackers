import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@peopletrackers/db';

/**
 * Settings — Admin only (§9.10, §15). Read-only reference-data endpoints (packages, case
 * types, statuses) live here too once Phase 3 needs them; not added until a screen consumes them.
 */
const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/settings', { preHandler: fastify.requireRole('admin') }, async () => {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  });
};

export default settingsRoutes;
