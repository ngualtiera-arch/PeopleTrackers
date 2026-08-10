import { escapeHtml, REPORT_BODY_FONT } from '../layout.js';
import type { CaseWithRelations } from './caseReport.js';

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString('en-AU') : '';
}

function subjectFullName(c: CaseWithRelations): string {
  return [c.subjectFirstname, c.subjectMiddlename, c.subjectLastname].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/** File List by Agent — spec §13.2 #5, §13.3. Same minimal style as Client Status Report. */
export function fileListByAgentTemplate(cases: CaseWithRelations[]): string {
  const rows = cases
    .map(
      (c) => `
    <tr>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${c.reference}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(c.client.company)}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(c.clientRef)}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(subjectFullName(c)).toUpperCase()}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(c.package?.name ?? null)}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(c.agent?.name ?? null)}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${escapeHtml(c.status.name)}</td>
      <td style="border-bottom:1px solid #eee;padding:4px 8px;">${fmtDate(c.dateDue)}</td>
    </tr>`,
    )
    .join('');

  return `
    <div style="${REPORT_BODY_FONT}">
      <h1 style="font-size:16px;margin:0 0 12px 0;">File List ${new Date().toLocaleDateString('en-AU')}</h1>
      <table style="width:100%;">
        <thead>
          <tr style="text-align:left;font-size:9px;text-transform:uppercase;color:#666;">
            <th style="border-bottom:1px solid #999;padding:4px 8px;">ID</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Client</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Client Ref.</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Subject</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Package</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Agent</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Status</th>
            <th style="border-bottom:1px solid #999;padding:4px 8px;">Due</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
