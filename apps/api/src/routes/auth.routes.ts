import type { FastifyPluginAsync } from 'fastify';
import argon2 from 'argon2';
import { authenticator } from 'otplib';
import { z } from 'zod';
import { prisma } from '@peopletrackers/db';
import { env } from '../env.js';
import type { AuthedUser } from '../plugins/auth.js';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';

// Simple in-memory lockout — fine for 2-5 users on one process (§17 "login rate limiting and lockout").
// Resets on API restart; a Redis-backed store is a straightforward future swap if the process
// footprint ever grows beyond one instance.
const failedAttempts = new Map<string, { count: number; lockedUntil: number | null }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totp: z.string().optional(),
});

function setAuthCookies(reply: import('fastify').FastifyReply, accessToken: string, refreshToken: string) {
  const cookieOpts = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: '/',
  };
  reply.setCookie('pt_access', accessToken, { ...cookieOpts, maxAge: 15 * 60 });
  reply.setCookie('pt_refresh', refreshToken, { ...cookieOpts, maxAge: 30 * 24 * 60 * 60 });
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/auth/login', { config: { public: true } }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const key = body.email.toLowerCase();

    const attempt = failedAttempts.get(key);
    if (attempt?.lockedUntil && attempt.lockedUntil > Date.now()) {
      return reply.tooManyRequests('Account temporarily locked after repeated failed attempts.');
    }

    const user = await prisma.user.findUnique({ where: { email: key } });

    const fail = () => {
      const next = { count: (attempt?.count ?? 0) + 1, lockedUntil: null as number | null };
      if (next.count >= MAX_ATTEMPTS) {
        next.lockedUntil = Date.now() + LOCKOUT_MS;
      }
      failedAttempts.set(key, next);
      return reply.unauthorized('Invalid email or password.');
    };

    if (!user || !user.isActive) {
      return fail();
    }

    const passwordOk = await argon2.verify(user.passwordHash, body.password);
    if (!passwordOk) {
      return fail();
    }

    if (user.totpSecret) {
      if (!body.totp || !authenticator.check(body.totp, user.totpSecret)) {
        return reply.unauthorized('Valid TOTP code required.');
      }
    }

    failedAttempts.delete(key);

    const payload: AuthedUser = { id: user.id, email: user.email, role: user.role };
    const accessToken = fastify.jwt.sign(payload, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = fastify.jwt.sign(payload, { expiresIn: REFRESH_TOKEN_TTL, key: env.JWT_REFRESH_SECRET });

    setAuthCookies(reply, accessToken, refreshToken);
    return { user: payload };
  });

  fastify.post('/auth/refresh', { config: { public: true } }, async (request, reply) => {
    const refreshToken = request.cookies['pt_refresh'];
    if (!refreshToken) {
      return reply.unauthorized('No refresh token.');
    }

    let payload: AuthedUser;
    try {
      payload = fastify.jwt.verify<AuthedUser>(refreshToken, { key: env.JWT_REFRESH_SECRET });
    } catch {
      return reply.unauthorized('Refresh token invalid or expired.');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive) {
      return reply.unauthorized('Account no longer active.');
    }

    const fresh: AuthedUser = { id: user.id, email: user.email, role: user.role };
    const accessToken = fastify.jwt.sign(fresh, { expiresIn: ACCESS_TOKEN_TTL });
    const newRefreshToken = fastify.jwt.sign(fresh, { expiresIn: REFRESH_TOKEN_TTL, key: env.JWT_REFRESH_SECRET });
    setAuthCookies(reply, accessToken, newRefreshToken);
    return { user: fresh };
  });

  fastify.post('/auth/logout', { config: { public: true } }, async (_request, reply) => {
    reply.clearCookie('pt_access', { path: '/' });
    reply.clearCookie('pt_refresh', { path: '/' });
    return { ok: true };
  });

  fastify.get('/auth/me', async (request) => {
    return { user: request.authUser };
  });
};

export default authRoutes;
