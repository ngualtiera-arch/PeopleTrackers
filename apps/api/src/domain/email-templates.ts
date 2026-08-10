import type { CaseWithRelations } from '../reports/templates/caseReport.js';
import type { EmailSettings } from '../lib/settings.js';

function subjectFullName(c: CaseWithRelations): string {
  return [c.subjectFirstname, c.subjectMiddlename, c.subjectLastname].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function applyTokens(template: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}

/** §14.1 — recipient defaults to Email Reports, falling back to Email. */
export function defaultReportRecipient(c: CaseWithRelations): string {
  return c.client.emailReports || c.client.email || '';
}

export function defaultReportEmail(c: CaseWithRelations, settings: EmailSettings): { subject: string; body: string } {
  const tokens = {
    client_contact_name: c.client.contactName ?? c.client.company ?? '',
    subject_full_name: subjectFullName(c),
    case_reference: String(c.reference),
    client_ref: c.clientRef ?? '',
  };
  return {
    subject: applyTokens(settings.reportEmailSubject, tokens),
    body: applyTokens(settings.reportEmailBody, tokens),
  };
}

/** §14.2 — body opens "Hi {agent first name}" then the subject's details, appended here (not
 *  left as an unresolved token) since the user edits the final plain text before sending. */
export function defaultAgentInstructionEmail(c: CaseWithRelations, settings: EmailSettings): { subject: string; body: string } {
  const agentFirstName = c.agent?.name?.split(' ')[0] ?? '';
  const opening = applyTokens(settings.agentInstructionBody, { agent_first_name: agentFirstName });

  const detailLines = [
    `Subject: ${subjectFullName(c)}`,
    c.subjectDob ? `Date of Birth: ${new Date(c.subjectDob).toLocaleDateString('en-AU')}` : null,
    c.subjectLicence ? `Drivers License: ${c.subjectLicence}` : null,
    c.subjectPhHome ? `Home Phone: ${c.subjectPhHome}` : null,
    c.subjectPhMobile ? `Mobile Phone: ${c.subjectPhMobile}` : null,
    c.subjectPhWork ? `Work Phone: ${c.subjectPhWork}` : null,
    [c.lastKnownAddr1, c.lastKnownAddr2, [c.lastKnownCity, c.lastKnownState, c.lastKnownPostcode].filter(Boolean).join(' ')]
      .filter(Boolean)
      .length > 0
      ? `Previous Address: ${[c.lastKnownAddr1, c.lastKnownAddr2, [c.lastKnownCity, c.lastKnownState, c.lastKnownPostcode].filter(Boolean).join(' ')].filter(Boolean).join(', ')}`
      : null,
  ].filter(Boolean);

  return {
    subject: applyTokens(settings.agentInstructionSubject, { case_reference: String(c.reference) }),
    body: `${opening}:\n\n${detailLines.join('\n')}`,
  };
}
