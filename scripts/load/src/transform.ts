import { AUSTRALIAN_STATES, DEFAULT_COUNTRY } from '@peopletrackers/shared';

/** FileMaker represents an in-field line break as a literal vertical-tab (0x0B) in the CSV export. */
const VERTICAL_TAB = '\x0b';

/**
 * A number of email/email_invoice values in the export end in a NUL byte (0x00) followed by
 * uninitialised-memory garbage (stray unicode chars) — a FileMaker fixed-width-field export
 * artifact, not real data. Postgres text columns reject NUL outright ("invalid byte sequence
 * for encoding UTF8: 0x00"). Truncate at the first NUL rather than merely stripping it, since
 * everything after it is garbage, not content — this is an encoding-artifact fix, not the data
 * cleanup D11 rules out.
 */
function truncateAtNul(value: string): string {
  const i = value.indexOf('\x00');
  return i === -1 ? value : value.slice(0, i);
}

/** Single-line field: strip vertical tabs entirely, then trim. */
export function cleanLine(value: string | undefined): string | null {
  if (value === undefined) return null;
  const cleaned = truncateAtNul(value).replaceAll(VERTICAL_TAB, ' ').trim();
  return cleaned === '' ? null : cleaned;
}

/** Multi-line field (notes): preserve the line break as \n instead of stripping it. */
export function cleanMultiline(value: string | undefined): string | null {
  if (value === undefined) return null;
  const cleaned = truncateAtNul(value).replaceAll(VERTICAL_TAB, '\n').trim();
  return cleaned === '' ? null : cleaned;
}

const STATE_ABBREVIATIONS: Record<string, string> = {
  vic: 'Victoria',
  nsw: 'New South Wales',
  qld: 'Queensland',
  sa: 'South Australia',
  wa: 'Western Australia',
  act: 'Australian Capital Territory',
};

/** Spec §8.4 "State normalisation" — abbreviations map to the value-list form; full names pass through. */
export function normalizeState(rawState: string | null, country: string | null): string | null {
  if (!rawState) return rawState;
  if (country && country !== DEFAULT_COUNTRY) return rawState; // free text outside Australia

  const key = rawState.trim().toLowerCase();
  if (key in STATE_ABBREVIATIONS) return STATE_ABBREVIATIONS[key];

  const matchFullName = AUSTRALIAN_STATES.find((s) => s.toLowerCase() === key);
  return matchFullName ?? rawState;
}

/** Parses the export's `dd/mm/yyyy` date format (§8.4 — valid on all 689 clients and 35 agents). */
export function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
}

/** Parses `dd/mm/yyyy h:mm:ss AM/PM` (Modified Time). */
export function parseDateTime(value: string | null): Date | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return parseDate(value); // fall back — a handful of rows may be date-only
  const [, d, mo, y, h, min, s, ampm] = m;
  let hour = Number(h) % 12;
  if (ampm.toUpperCase() === 'PM') hour += 12;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), hour, Number(min), Number(s)));
}

export function parseDecimal(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : null;
}

// Deliberately permissive — this only decides the needs_review flag (§8.5), it never
// rejects or corrects a value. D11: loaded verbatim regardless of validity.
const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string | null): boolean {
  if (!value) return true; // empty is not "invalid" — it's just absent
  return SIMPLE_EMAIL_RE.test(value.trim());
}

/** Spec §8.4 "Agent skills" — newline-separated in the export (vertical-tab per field, not \n). */
export function splitSkills(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(VERTICAL_TAB)
    .map((s) => s.trim())
    .filter(Boolean);
}
