import type { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', { config: { public: true } }, async () => ({ status: 'ok' }));
};

export default healthRoutes;
