import fastifyPlugin from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '@peopletrackers/shared';

export interface AuthedUser {
  id: string;
  email: string;
  role: UserRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    // Named authUser, not user — @fastify/jwt already augments FastifyRequest.user
    // with its own decoded-payload type, and the two declarations would collide.
    authUser: AuthedUser | null;
  }
  interface FastifyContextConfig {
    public?: boolean;
  }
  interface FastifyInstance {
    requireRole(role: UserRole): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Secure-by-default: every route requires a valid access-token cookie unless its
 * route config explicitly sets `{ config: { public: true } }` — spec §15 requires
 * permissions enforced server-side on every endpoint, not opt-in per route.
 */
const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('authUser', null);

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.routeOptions.config?.public) {
      return;
    }

    const token = request.cookies['pt_access'];
    if (!token) {
      return reply.unauthorized('Not authenticated.');
    }

    try {
      const payload = fastify.jwt.verify<AuthedUser>(token);
      request.authUser = payload;
    } catch {
      return reply.unauthorized('Session expired or invalid.');
    }
  });

  fastify.decorate('requireRole', (role: UserRole) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.authUser) {
        return reply.unauthorized('Not authenticated.');
      }
      if (request.authUser.role !== role) {
        return reply.forbidden(`Requires ${role} role.`);
      }
    };
  });
};

export default fastifyPlugin(authPlugin);
