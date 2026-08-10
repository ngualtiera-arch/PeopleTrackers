import { escapeHtml, REPORT_BODY_FONT } from '../layout.js';
import type { CaseWithRelations } from './caseReport.js';

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString('en-AU') : '';
}

function subjectFullName(c: CaseWithRelations): string {
  return [c.subjectFirstname, c.subjectMiddlename, c.subjectLastname].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Client Status Report — spec §13.2 #4, §13.3. No page header/footer, just a title + date and
 * the table — deliberately simpler than the client-facing letter reports. The logo sits inline
 * in the title row itself rather than as a Playwright page header (confirmed from a real
 * sample, Filemaker "Layout" folder, client status report.pdf).
 */
export function clientStatusReportTemplate(cases: CaseWithRelations[], logoUrl?: string | null): string {
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" style="height:36px;" />`
    : '';
  const rows = cases
    .map(
      (c) => `
    <tr>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${fmtDate(c.dateEntered)}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(c.client.company)}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(c.clientRef)}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(subjectFullName(c)).toUpperCase()}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(c.caseType.name)}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${fmtDate(c.dateClosed)}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${c.reference}</td>
    </tr>`,
    )
    .join('');

  return `
    <div style="${REPORT_BODY_FONT}">
      <table style="width:100%;margin-bottom:12px;">
        <tr>
          <td style="vertical-align:middle;"><h1 style="font-size:16px;margin:0;">Client Status Report ${new Date().toLocaleDateString('en-AU')}</h1></td>
          <td style="text-align:right;vertical-align:middle;">${logo}</td>
        </tr>
      </table>
      <table style="width:100%;">
        <thead>
          <tr style="text-align:left;font-size:9px;text-transform:uppercase;color:#666;">
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Date Entered</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Client</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Client Ref.</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Subject</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Type</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Date Closed</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Our Ref.</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
