import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  COOKIE_SECURE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const env = schema.parse(process.env);
