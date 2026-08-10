/**
 * PDF storage abstraction. Only PDFs that are actually emailed are stored (§13.5, §2.6) — a
 * preview/download/print never calls this. Production should use Supabase Storage per the
 * project's technical guidance ("prefer Supabase Storage rather than a separate S3 service"),
 * serving emailed PDFs only via short-lived signed URLs (§17). That wiring needs a Supabase
 * service-role key, which wasn't available while building this — LocalDiskStorage below is a
 * dev/test stand-in behind the same interface, so swapping in the real implementation later
 * doesn't touch any call site.
 */
export interface DocumentStorage {
  save(key: string, content: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
}
