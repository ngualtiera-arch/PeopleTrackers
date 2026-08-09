import fastifyPlugin from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';

/**
 * Never let an unexpected error (DB connection failure, unhandled exception, etc.) leak
 * internals — stack traces, file paths, driver error text — to the client. Log the full
 * error server-side; return a flat, generic message for anything not already a deliberate
 * client-facing error (Zod validation, or @fastify/sensible's reply.unauthorized/forbidden/etc).
 */
const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed.',
        issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }

    const err = error as { statusCode?: number; name?: string; message?: string };
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
    if (statusCode < 500) {
      return reply.status(statusCode).send({
        statusCode,
        error: err.name ?? 'Error',
        message: err.message ?? 'Request failed.',
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Something went wrong. Please try again.',
    });
  });
};

export default fastifyPlugin(errorHandlerPlugin);
