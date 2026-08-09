import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@peopletrackers/db';

const updateSchema = z.object({ body: z.string() });

/** Report template editor — §9.9. Reached from "Edit Templates" on the case screen. */
const templatesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/report-templates', async () => {
    return prisma.reportTemplate.findMany({ orderBy: { code: 'asc' } });
  });

  fastify.put<{ Params: { code: string } }>('/report-templates/:code', async (request, reply) => {
    const { body } = updateSchema.parse(request.body);
    try {
      return await prisma.reportTemplate.update({
        where: { code: request.params.code },
        data: { body, updatedBy: request.authUser?.id },
      });
    } catch {
      return reply.notFound('Template not found.');
    }
  });
};

export default templatesRoutes;
