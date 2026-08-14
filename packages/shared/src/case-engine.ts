import { PACKAGES, CASE_TYPES, CASE_STATUSES, DEFAULT_DAYS_UNTIL_DUE } from './reference-data.js';
import type { PackageCode, CaseTypeCode, CaseStatusCode } from './reference-data.js';

/**
 * Pure business-rules functions transcribed from spec §6.1-§6.7. DB-independent and
 * side-effect-free by design: the route layer decides WHEN to call these (only when a
 * trigger field is actually present in an update payload, or always on create — §6.4's
 * "replace existing value" behaviour), these functions only decide WHAT the result is.
 */

function findPackage(code: PackageCode) {
  const pkg = PACKAGES.find((p) => p.code === code);
  if (!pkg) throw new Error(`Unknown package code: ${code}`);
  return pkg;
}

function findCaseType(code: CaseTypeCode) {
  const type = CASE_TYPES.find((t) => t.code === code);
  if (!type) throw new Error(`Unknown case type code: ${code}`);
  return type;
}

function findCaseStatus(code: CaseStatusCode) {
  const status = CASE_STATUSES.find((s) => s.code === code);
  if (!status) throw new Error(`Unknown case status code: ${code}`);
  return status;
}

/**
 * §6.2 Package resolution. Runs on create, and whenever client_id or case_type_id changes.
 * Source formula: Case(Type = "Skip Trace"; If(IsEmpty(client::Package); "Standard"; client::Package); "")
 */
export function resolvePackageCode(clientPackageCode: PackageCode | null, caseTypeCode: CaseTypeCode): PackageCode | null {
  const caseType = findCaseType(caseTypeCode);
  if (!caseType.usesPackage) return null;
  return clientPackageCode ?? 'standard';
}

/** §6.3 Rate resolution. Runs whenever package_id or case_type_id changes. */
export function resolveRates(
  packageCode: PackageCode | null,
  caseTypeCode: CaseTypeCode,
): { rateLocate: number; rateNonLocate: number } {
  if (packageCode) {
    const pkg = findPackage(packageCode);
    return { rateLocate: pkg.locateRate, rateNonLocate: pkg.nonLocateRate };
  }

  const caseType = findCaseType(caseTypeCode);
  if (caseType.locateRate !== null && caseType.nonLocateRate !== null) {
    return { rateLocate: caseType.locateRate, rateNonLocate: caseType.nonLocateRate };
  }

  return { rateLocate: 0, rateNonLocate: 0 }; // source's trailing "; 0" fallback
}

/** §6.4 Fee. Runs whenever status_id, rate_locate, rate_non_locate or units changes. */
export function resolveFee(statusCode: CaseStatusCode, rateLocate: number, rateNonLocate: number): number {
  const status = findCaseStatus(statusCode);
  switch (status.feeRule) {
    case 'zero':
      return 0;
    case 'non_locate_rate':
      return rateNonLocate;
    case 'locate_rate':
      return rateLocate;
  }
}

/** §6.4 Amount = fee * units. */
export function resolveAmount(fee: number, units: number): number {
  return fee * units;
}

/** §6.1 date_due = date_entered + 14 days. */
export function resolveDefaultDueDate(dateEntered: Date): Date {
  const due = new Date(dateEntered);
  due.setDate(due.getDate() + DEFAULT_DAYS_UNTIL_DUE);
  return due;
}

/**
 * §6.5 Status change side effect: date_closed is re-stamped to today on EVERY change to a
 * non-"New Instruction" status — including a later correction. Deliberately not "improved"
 * (§2.5) — reproduce exactly, do not special-case repeated transitions.
 */
export function shouldStampDateClosed(newStatusCode: CaseStatusCode): boolean {
  return newStatusCode !== 'new_instruction';
}

/**
 * "Today" as the business actually experiences it — Sydney's calendar date, not the server's
 * (server runs UTC; Sydney is UTC+10/+11, so naive `new Date()` is a day behind for roughly the
 * first 10-11 hours of the Sydney day). Returned as a UTC midnight Date so it round-trips
 * cleanly through a Postgres DATE column regardless of the server's local timezone.
 */
export function sydneyToday(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  return new Date(Date.UTC(y, m - 1, d));
}

/** §6.6 Subject full name — double spaces collapsed. */
export function subjectFullName(firstname: string | null, middlename: string | null, lastname: string | null): string {
  return [firstname, middlename, lastname]
    .filter((v): v is string => Boolean(v))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
