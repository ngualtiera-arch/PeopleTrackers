import type { CaseStatusCode } from './reference-data.js';

export type CaseReportCode = 'case_report' | 'update_report' | 'agent_instruction' | 'client_status_report' | 'file_list_by_agent';

export const CASE_REPORT_OPTIONS: { code: CaseReportCode; label: string; scope: 'single' | 'result_set' }[] = [
  { code: 'case_report', label: 'File Report', scope: 'single' },
  { code: 'update_report', label: 'File Update', scope: 'single' },
  { code: 'agent_instruction', label: 'Agent Instruction', scope: 'single' },
  { code: 'client_status_report', label: 'Client Status Report', scope: 'result_set' },
  { code: 'file_list_by_agent', label: 'File List by Agent', scope: 'result_set' },
];

/**
 * §13.4 report chooser default selection — reproduced exactly from the source's own logic:
 *   if on the list screen:              default = 'Client Status Report'
 *   else if status = 'New Instruction': default = 'Agent Instruction'
 *   else if status = 'Leads Obtained':  default = 'File Update'
 *   else:                               default = 'File Report'
 */
export function defaultReportChoice(context: 'list' | 'detail', statusCode?: CaseStatusCode): CaseReportCode {
  if (context === 'list') return 'client_status_report';
  if (statusCode === 'new_instruction') return 'agent_instruction';
  if (statusCode === 'leads_obtained') return 'update_report';
  return 'case_report';
}

/** Default scope: Current Record on the detail screen, Records Being Browsed on the list screen. */
export function defaultReportScope(context: 'list' | 'detail'): 'current' | 'browsed' {
  return context === 'list' ? 'browsed' : 'current';
}
