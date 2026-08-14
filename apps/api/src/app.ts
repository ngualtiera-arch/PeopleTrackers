import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
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
import casesRoutes from './routes/cases.routes.js';
import templatesRoutes from './routes/templates.routes.js';
import emailRoutes from './routes/email.routes.js';
import usersRoutes from './routes/users.routes.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(errorHandlerPlugin);
  // Every response here is per-request dynamic (auth-scoped JSON, or a PDF generated fresh from
  // whatever's currently saved) — nothing on this API is ever safe to cache. Without this,
  // Railway's edge CDN caching (enabled for the web app's static assets) was also caching PDF
  // responses with no explicit signal not to, serving a stale report from before an edit was
  // saved. Confirmed live: x-cache: HIT on a report that had genuinely changed underneath it.
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('Cache-Control', 'no-store');
    return payload;
  });
  const allowedOrigins = env.WEB_ORIGIN.split(',').map((o) => o.trim());
  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  // §17 hardening. CSP off: this is a JSON/PDF API with no HTML responses of its own to
  // protect — the other headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.) still apply.
  await app.register(helmet, { contentSecurityPolicy: false });
  // Global safety net against brute-force/scraping; login gets a much tighter override below
  // on top of its own existing per-email lockout (auth.routes.ts) — this is IP-based defense
  // in depth, not a replacement for it.
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
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
  await app.register(casesRoutes);
  await app.register(templatesRoutes);
  await app.register(emailRoutes);
  await app.register(usersRoutes);

  return app;
}
