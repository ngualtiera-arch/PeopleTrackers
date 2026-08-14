import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../env.js';

const BUCKET = 'case-attachments';

/**
 * Storage for case attachments (screenshots/PDFs a user uploads onto a case) — separate from
 * DocumentStorage (storage.ts), which is only for PDFs the system itself generates and emails.
 * Different bucket, arbitrary content-type, and attachments are user-deletable, so this needs
 * its own small interface rather than reusing that one.
 */
export interface AttachmentStorage {
  save(key: string, content: Buffer, contentType: string): Promise<void>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

/** Production — Supabase Storage, private bucket (see the bucket's own MIME/size allowlist). */
class SupabaseAttachmentStorage implements AttachmentStorage {
  private client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey);
  }

  async save(key: string, content: Buffer, contentType: string): Promise<void> {
    const { error } = await this.client.storage.from(BUCKET).upload(key, content, { contentType, upsert: true });
    if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  async read(key: string): Promise<Buffer> {
    const { data, error } = await this.client.storage.from(BUCKET).download(key);
    if (error) throw new Error(`Supabase Storage download failed: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }

  async remove(key: string): Promise<void> {
    const { error } = await this.client.storage.from(BUCKET).remove([key]);
    if (error) throw new Error(`Supabase Storage delete failed: ${error.message}`);
  }
}

// Resolved relative to this module, not process.cwd() — same reasoning as storage.ts's
// LocalDiskStorage: cwd depends on where the process was launched from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.resolve(__dirname, '../../storage-data/attachments');

/** Dev/test stand-in — used when Supabase credentials aren't configured. */
class LocalDiskAttachmentStorage implements AttachmentStorage {
  async save(key: string, content: Buffer): Promise<void> {
    await mkdir(STORAGE_DIR, { recursive: true });
    await writeFile(path.join(STORAGE_DIR, key), content);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(path.join(STORAGE_DIR, key));
  }

  async remove(key: string): Promise<void> {
    await unlink(path.join(STORAGE_DIR, key)).catch(() => {});
  }
}

export const attachmentStorage: AttachmentStorage =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? new SupabaseAttachmentStorage(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : new LocalDiskAttachmentStorage();
