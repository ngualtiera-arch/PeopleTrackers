import { escapeHtml, REPORT_BODY_FONT } from '../layout.js';
import type { CaseWithRelations } from './caseReport.js';

function fmtDueDate(d: Date | null): string {
  if (!d) return '';
  const date = new Date(d);
  const weekday = date.toLocaleDateString('en-AU', { weekday: 'long' });
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-AU', { month: 'long' });
  return `${weekday}, ${day} ${month} ${date.getFullYear()}`;
}

function field(label: string, value: string | null | undefined): string {
  return `<div style="margin-bottom:10px;"><span style="display:inline-block;width:110px;color:#555;">${label}</span>${escapeHtml(value)}</div>`;
}

/**
 * Agent Instruction — spec §13.2 #3, §13.3. Confirmed layout and field order against
 * newinstructionstemplate.pdf. HARD REQUIREMENT: no client identifying information anywhere
 * on this document — do not add client fields here even if it seems convenient.
 */
export function agentInstructionTemplate(c: CaseWithRelations): string {
  const subjectFullName = [c.subjectFirstname, c.subjectMiddlename, c.subjectLastname]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const lastKnownAddress = [
    c.lastKnownAddr1,
    c.lastKnownAddr2,
    [c.lastKnownCity, c.lastKnownState, c.lastKnownPostcode].filter(Boolean).join(' '),
    c.lastKnownCountry && c.lastKnownCountry !== 'Australia' ? c.lastKnownCountry : null,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join('<br/>');

  const employerAddress = [
    c.employer,
    c.employerAddr1,
    c.employerAddr2,
    [c.employerCity, c.employerState, c.employerPostcode].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join('<br/>');

  return `
    <div style="${REPORT_BODY_FONT}">
      <table style="width:100%;margin-bottom:20px;">
        <tr>
          <td>OUR REF. <strong>${c.reference}</strong></td>
          <td style="text-align:right;">Date file due for completion <strong>${fmtDueDate(c.dateDue)}</strong></td>
        </tr>
      </table>

      <div style="margin-bottom:16px;">Subject Details <strong>${escapeHtml(subjectFullName).toUpperCase()}</strong></div>

      ${field('Last Name', c.subjectLastname)}
      ${field('First Name', c.subjectFirstname)}
      ${field('Middle Name', c.subjectMiddlename)}
      ${field('Date of Birth', c.subjectDob ? new Date(c.subjectDob).toLocaleDateString('en-AU') : null)}
      ${field('Drivers License', c.subjectLicence)}
      ${field('Home Phone', c.subjectPhHome)}
      ${field('Mobile Phone', c.subjectPhMobile)}
      ${field('Work Phone', c.subjectPhWork)}

      <div style="margin-bottom:10px;">
        <span style="display:inline-block;width:110px;color:#555;vertical-align:top;">Previous Address</span>
        <span>${lastKnownAddress || '—'}</span>
      </div>

      <div style="margin-bottom:10px;">
        <span style="display:inline-block;width:110px;color:#555;vertical-align:top;">Employer</span>
        <span>${employerAddress || '—'}</span>
      </div>

      <div style="margin-bottom:10px;">
        <span style="display:inline-block;width:110px;color:#555;vertical-align:top;">Additional Info</span>
        <span>${escapeHtml(c.additionalInfo) || '—'}</span>
      </div>
    </div>
  `;
}
