import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DocumentStorage } from './storage.js';

// Resolved relative to this module, not process.cwd() — cwd depends on where the process was
// launched from (e.g. the monorepo root vs apps/api), which made this land in a different
// place depending on how the dev server was started.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.resolve(__dirname, '../../storage-data');

/** Dev/test DocumentStorage — see storage.ts for why this isn't Supabase Storage yet. */
export class LocalDiskStorage implements DocumentStorage {
  async save(key: string, content: Buffer): Promise<void> {
    await mkdir(STORAGE_DIR, { recursive: true });
    await writeFile(path.join(STORAGE_DIR, key), content);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(path.join(STORAGE_DIR, key));
  }
}
