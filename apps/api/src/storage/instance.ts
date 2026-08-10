import { env } from '../env.js';
import { LocalDiskStorage } from './localDiskStorage.js';
import { SupabaseStorage } from './supabaseStorage.js';
import type { DocumentStorage } from './storage.js';

export const documentStorage: DocumentStorage =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? new SupabaseStorage(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : new LocalDiskStorage();
