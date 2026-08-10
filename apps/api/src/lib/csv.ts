/** Minimal RFC 4180 CSV encoder — quotes a field only when it needs it. */
function csvField(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [header.map(csvField).join(','), ...rows.map((row) => row.map(csvField).join(','))];
  // Leading BOM so Excel opens the file as UTF-8 instead of guessing the system codepage.
  return '﻿' + lines.join('\r\n') + '\r\n';
}
