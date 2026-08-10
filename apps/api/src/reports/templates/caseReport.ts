import type { Prisma } from '@peopletrackers/db';
import { escapeHtml, escapeMultiline, REPORT_BODY_FONT } from '../layout.js';

export type CaseWithRelations = Prisma.CaseGetPayload<{
  include: { client: true; agent: true; caseType: true; status: true; package: true };
}>;

function subjectFullName(c: CaseWithRelations): string {
  return [c.subjectFirstname, c.subjectMiddlename, c.subjectLastname]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString('en-AU') : '';
}

/**
 * Case Report — spec §13.2 #1, §13.3. Letterhead/footer applied by the caller (render.ts).
 * Confirmed verbatim against skipreport.pdf and fieldcallreport.pdf (both show this exact
 * intro, "AGENTS REPORT" heading, "RE:" line and sign-off for the same sample case).
 */
export function caseReportTemplate(c: CaseWithRelations): string {
  return `
    <div style="${REPORT_BODY_FONT}">
      <table style="width:100%;margin-bottom:16px;">
        <tr>
          <td style="width:60%;vertical-align:top;">
            ${escapeHtml(c.client.company)}<br/>
            ${c.client.contactName ? `${escapeHtml(c.client.contactName)}<br/>` : ''}
            ${escapeHtml(c.client.addr1)}<br/>
            ${c.client.addr2 ? `${escapeHtml(c.client.addr2)}<br/>` : ''}
            ${[c.client.city, c.client.state, c.client.postcode].filter(Boolean).map(escapeHtml).join(' ')}
            ${c.client.country && c.client.country !== 'Australia' ? `<br/>${escapeHtml(c.client.country)}` : ''}
          </td>
          <td style="width:40%;vertical-align:top;text-align:right;">
            <div style="font-size:16px;font-weight:bold;">${escapeHtml(c.status.name).toUpperCase()}</div>
            ${c.dateClosed ? `<div>Date Closed: ${fmtDate(c.dateClosed)}</div>` : ''}
            <div style="margin-top:6px;">OUR REF: ${c.reference}</div>
            <div>YOUR REF: ${escapeHtml(c.clientRef)}</div>
          </td>
        </tr>
      </table>

      <p>Thank you for your instructions to locate the subject as indicated below. Please see below for our
      report on our investigations. If you have any queries regarding this report, please do not hesitate to
      contact our office.</p>

      <p><strong>AGENTS REPORT</strong></p>

      <p><strong>RE: ${escapeHtml(subjectFullName(c)).toUpperCase()}</strong></p>

      <div>${escapeMultiline(c.report)}</div>

      <p style="margin-top:16px;">We trust this information is of assistance and thank you for your instructions.</p>
      <p>Yours truly,</p>
      <p><u>People Trackers Australia</u></p>
    </div>
  `;
}
