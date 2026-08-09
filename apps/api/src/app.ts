import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { env } from './env.js';
import authPlugin from './plugins/auth.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import authRoutes from './routes/auth.routes.js';
import healthRoutes from './routes/health.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import clientsRoutes from './routes/clients.routes.js';
import agentsRoutes from './routes/agents.routes.js';
import reportsRoutes from './routes/reports.routes.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(errorHandlerPlugin);
  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.register(sensible);
  await app.register(cookie);
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET });
  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(settingsRoutes);
  await app.register(clientsRoutes);
  await app.register(agentsRoutes);
  await app.register(reportsRoutes);

  return app;
}
