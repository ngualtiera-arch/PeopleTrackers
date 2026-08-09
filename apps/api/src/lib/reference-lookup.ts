import { prisma } from '@peopletrackers/db';
import type { CaseTypeCode, CaseStatusCode, PackageCode } from '@peopletrackers/shared';

/**
 * Reference data (packages, case_types, case_statuses) is read-only in V1 (§7) — safe to
 * cache for the life of the process. Avoids a round trip per code->id lookup on every case
 * write. If Settings ever makes these editable, this cache needs an invalidation path.
 */
const caseTypeIdByCode = new Map<string, string>();
const caseStatusIdByCode = new Map<string, string>();
const packageIdByCode = new Map<string, string>();

async function ensureLoaded() {
  if (caseTypeIdByCode.size > 0) return;
  const [types, statuses, packages] = await Promise.all([
    prisma.caseType.findMany(),
    prisma.caseStatus.findMany(),
    prisma.package.findMany(),
  ]);
  for (const t of types) caseTypeIdByCode.set(t.code, t.id);
  for (const s of statuses) caseStatusIdByCode.set(s.code, s.id);
  for (const p of packages) packageIdByCode.set(p.code, p.id);
}

export async function caseTypeIdFor(code: CaseTypeCode): Promise<string> {
  await ensureLoaded();
  const id = caseTypeIdByCode.get(code);
  if (!id) throw new Error(`Unknown case type code: ${code}`);
  return id;
}

export async function caseStatusIdFor(code: CaseStatusCode): Promise<string> {
  await ensureLoaded();
  const id = caseStatusIdByCode.get(code);
  if (!id) throw new Error(`Unknown case status code: ${code}`);
  return id;
}

export async function packageIdFor(code: PackageCode): Promise<string> {
  await ensureLoaded();
  const id = packageIdByCode.get(code);
  if (!id) throw new Error(`Unknown package code: ${code}`);
  return id;
}
