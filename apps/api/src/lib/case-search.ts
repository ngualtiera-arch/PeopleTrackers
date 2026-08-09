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
 * - date_entered / date_due are not included in free-text search — filtering by date is
 *   better served by the saved filters (§12.2) and column sort than a text field.
 */
export function buildCaseSearch(query: string): Prisma.CaseWhereInput {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return {};

  return {
    AND: words.map((word): Prisma.CaseWhereInput => {
      const asNumber = /^\d+$/.test(word) ? Number(word) : null;
      return {
        OR: [
          ...(asNumber !== null ? [{ reference: asNumber }] : []),
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
