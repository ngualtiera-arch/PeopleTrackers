import type { FastifyPluginAsync } from 'fastify';
import argon2 from 'argon2';
import { z } from 'zod';
import { Prisma, prisma } from '@peopletrackers/db';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'staff']),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'staff']).optional(),
  isActive: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const USER_SELECT = { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true } as const;

/** User management — Admin only (§9.10, §15). No self-service reset (§9.1) — an Admin resets passwords directly. */
const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users', { preHandler: fastify.requireRole('admin') }, async () => {
    return prisma.user.findMany({ select: USER_SELECT, orderBy: { email: 'asc' } });
  });

  fastify.post('/users', { preHandler: fastify.requireRole('admin') }, async (request, reply) => {
    const body = createUserSchema.parse(request.body);
    const passwordHash = await argon2.hash(body.password, { type: argon2.argon2id });
    try {
      const user = await prisma.user.create({
        data: { email: body.email, name: body.name, role: body.role, passwordHash },
        select: USER_SELECT,
      });
      return reply.status(201).send(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return reply.conflict('A user with that email already exists.');
      }
      throw err;
    }
  });

  fastify.put<{ Params: { id: string } }>('/users/:id', { preHandler: fastify.requireRole('admin') }, async (request, reply) => {
    const body = updateUserSchema.parse(request.body);

    // Guard against an admin locking everyone out by deactivating or demoting their own account.
    if (request.authUser?.id === request.params.id) {
      if (body.isActive === false) return reply.badRequest('You cannot deactivate your own account.');
      if (body.role === 'staff') return reply.badRequest('You cannot remove your own admin role.');
    }

    try {
      const user = await prisma.user.update({ where: { id: request.params.id }, data: body, select: USER_SELECT });
      return user;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return reply.notFound('User not found.');
      }
      throw err;
    }
  });

  fastify.post<{ Params: { id: string } }>('/users/:id/reset-password', { preHandler: fastify.requireRole('admin') }, async (request, reply) => {
    const body = resetPasswordSchema.parse(request.body);
    const passwordHash = await argon2.hash(body.password, { type: argon2.argon2id });
    try {
      await prisma.user.update({ where: { id: request.params.id }, data: { passwordHash } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return reply.notFound('User not found.');
      }
      throw err;
    }
    return { ok: true };
  });
};

export default usersRoutes;
