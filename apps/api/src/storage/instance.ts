import { LocalDiskStorage } from './localDiskStorage.js';
import type { DocumentStorage } from './storage.js';

// Swap for a Supabase Storage implementation once its service-role key is available — see storage.ts.
export const documentStorage: DocumentStorage = new LocalDiskStorage();
