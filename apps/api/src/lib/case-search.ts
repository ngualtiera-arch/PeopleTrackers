import type { Prisma } from '@peopletrackers/db';

/**
 * Case Find (§12.1): reference, client, client ref, subject names, agent, status, type, date
 * entered, date due. Unlike clients/agents, several of these are relation fields (client,
 * agent, type, status) or non-string columns (reference), so the flat buildBeginsWithSearch
 * helper doesn't apply directly.
 *
 * Simplifications from the full spec field list, given the query shape:
 * - `reference` matches on EXACT numeric equality, not prefix — case references are precise
 *   5-digit numbers a user types in full (unlike a name), and prefix-matching an integer
 *   column needs a raw CAST that doesn't compose cleanly with Prisma's query builder here.
 * - date_entered / date_due match on EXACT day equality (a word shaped like a date), not a
 *   range — matches the same "type a word, it narrows things down" pattern as everything else
 *   in the box. A real date-range filter would need its own dedicated control, not a text field.
 */
function parseDateToken(word: string): Date | null {
  // DD/MM/YYYY — the format every date on screen is already displayed in (en-AU).
  let m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(word);
  if (m) return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  // YYYY-MM-DD — ISO, in case someone pastes one from elsewhere.
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(word);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return null;
}
/** §12.2 saved filters — shared between the case list and the report endpoints, which both
 *  need to render/act on "the current filtered set". */
export function caseFilterWhere(filter: string): Prisma.CaseWhereInput {
  switch (filter) {
    case 'new_instruction':
      return { status: { code: 'new_instruction' } };
    case 'to_report':
      return { reportSent: false };
    case 'to_invoice':
      return { invoiced: false };
    default:
      return {};
  }
}

export function buildCaseSearch(query: string): Prisma.CaseWhereInput {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return {};

  return {
    AND: words.map((word): Prisma.CaseWhereInput => {
      const asNumber = /^\d+$/.test(word) ? Number(word) : null;
      const asDate = parseDateToken(word);
      return {
        OR: [
          ...(asNumber !== null ? [{ reference: asNumber }] : []),
          ...(asDate ? [{ dateDue: asDate }, { dateEntered: asDate }] : []),
          { clientRef: { startsWith: word, mode: 'insensitive' as const } },
          { subjectFirstname: { startsWith: word, mode: 'insensitive' as const } },
          { subjectMiddlename: { startsWith: word, mode: 'insensitive' as const } },
          { subjectLastname: { startsWith: word, mode: 'insensitive' as const } },
          { client: { company: { startsWith: word, mode: 'insensitive' as const } } },
          { client: { contactName: { startsWith: word, mode: 'insensitive' as const } } },
          { agent: { name: { startsWith: word, mode: 'insensitive' as const } } },
          { caseType: { name: { startsWith: word, mode: 'insensitive' as const } } },
          { status: { name: { startsWith: word, mode: 'insensitive' as const } } },
        ],
      };
    }),
  };
}
