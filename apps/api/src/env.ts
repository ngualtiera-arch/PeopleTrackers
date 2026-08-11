import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  // Comma-separated — supports both localhost (this Mac) and a LAN IP (other devices on the
  // same Wi-Fi) at once when hosting locally, e.g. "http://localhost:5173,http://192.168.1.5:5173".
  WEB_ORIGIN: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  COOKIE_SECURE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Optional — Supabase Storage for emailed-report PDFs (§13.5, §17). Both unset falls back to
  // local disk (dev/test only, see storage/localDiskStorage.ts); set both to switch over.
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

export const env = schema.parse(process.env);
