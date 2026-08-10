import { escapeHtml, escapeMultiline, REPORT_BODY_FONT } from '../layout.js';
import type { CaseWithRelations } from './caseReport.js';

function subjectFullName(c: CaseWithRelations): string {
  return [c.subjectFirstname, c.subjectMiddlename, c.subjectLastname]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TODAY_LONG = () =>
  new Date().toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

/**
 * Update Report — spec §13.2 #2, §13.3. Confirmed verbatim against updatereport.pdf, including
 * the outro — which is genuinely TRUNCATED in the supplied sample (spec §22 flags this
 * explicitly as content still to be captured). The paragraph below ends exactly where the
 * sample cuts off; do not invent the missing continuation.
 */
export function updateReportTemplate(c: CaseWithRelations): string {
  return `
    <div style="${REPORT_BODY_FONT}">
      <table style="width:100%;margin-bottom:16px;">
        <tr>
          <td style="width:60%;vertical-align:top;">
            ${escapeHtml(c.client.company)}<br/>
            ${escapeHtml(c.client.addr1)}<br/>
            ${c.client.addr2 ? `${escapeHtml(c.client.addr2)}<br/>` : ''}
            ${[c.client.city, c.client.state, c.client.postcode].filter(Boolean).map(escapeHtml).join(' ')}
            ${c.client.contactName ? `<br/>${escapeHtml(c.client.contactName)}` : ''}
          </td>
          <td style="width:40%;vertical-align:top;text-align:right;">
            <div>${TODAY_LONG()}</div>
            <div><strong>PEOPLE TRACKERS REF: ${c.reference}</strong></div>
            <div><strong>YOUR REF: ${escapeHtml(c.clientRef)}</strong></div>
          </td>
        </tr>
      </table>

      <p>Thank you for your instructions to locate the subject(s) below. Our preliminary searches have not
      yet resulted in any confirmation of a new address or contact phone number for this subject.</p>
      <p>Please see below for details of our investigations to date. <strong><em>PLEASE DO NOT MAKE CONTACT
      WITH ANY OF THE PEOPLE, ADDRESSES OR PHONE NUMBERS IN THIS REPORT AS IT MAY HAVE A NEGATIVE IMPACT ON
      OUR INVESTIGATIONS.</em></strong></p>

      <p><strong>UPDATE REPORT</strong></p>

      <p><strong>RE: ${escapeHtml(subjectFullName(c)).toUpperCase()}</strong></p>

      <div>${escapeMultiline(c.report)}</div>

      <!-- TODO §22: outro truncated in the supplied sample — capture the full paragraph from
           the live TemplatesEdit screen before go-live. -->
      <p style="margin-top:16px;">FURTHER SEARCHES AND ENQUIRIES WILL BE MADE ON THIS FILE AND WE WILL
      NOTIFY YOU OF OUR FINDINGS AT OUR EARLIEST CONVENIENCE. PLEASE DO NOT HESITATE TO CONTACT OUR OFFICE
      WITH ANY NEW OR&hellip;</p>

      <p style="margin-top:16px;">We trust this information is of assistance and thank you for your instructions.</p>
      <p>Yours truly,</p>
      <p><u>People Trackers Australia</u></p>
    </div>
  `;
}
