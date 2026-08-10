import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DocumentStorage } from './storage.js';

const BUCKET = 'case-reports';

/**
 * Production DocumentStorage — Supabase Storage, per the project's technical guidance ("prefer
 * Supabase Storage rather than a separate S3 service"). Bucket is private; every read goes
 * through the service-role client rather than a public URL, so a leaked object path alone
 * doesn't expose a client's report (§17).
 */
export class SupabaseStorage implements DocumentStorage {
  private client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey);
  }

  async save(key: string, content: Buffer): Promise<void> {
    const { error } = await this.client.storage
      .from(BUCKET)
      .upload(key, content, { contentType: 'application/pdf', upsert: true });
    if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  async read(key: string): Promise<Buffer> {
    const { data, error } = await this.client.storage.from(BUCKET).download(key);
    if (error) throw new Error(`Supabase Storage download failed: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
}
