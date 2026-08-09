/**
 * Reproduces FileMaker's default Find behaviour — spec §12.1: "Text matching is 'begins with'
 * per word." Each query word must match the START OF A WORD somewhere in at least one of the
 * given fields — not just the start of the whole field. "Gualt" must match "Nicole Gualtiera"
 * (a name field, second word), not only fields that themselves start with "Gualt". A plain
 * `startsWith` would miss that; matching `startsWith` OR "contains ' word'" (space-preceded)
 * approximates FileMaker's word-boundary matching for space-delimited text without needing a
 * regex/word-boundary operator Prisma doesn't expose for Postgres string filters.
 */
export function buildBeginsWithSearch(query: string, fields: string[]) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return {};

  return {
    AND: words.map((word) => ({
      OR: fields.flatMap((field) => [
        { [field]: { startsWith: word, mode: 'insensitive' as const } },
        { [field]: { contains: ` ${word}`, mode: 'insensitive' as const } },
      ]),
    })),
  };
}
