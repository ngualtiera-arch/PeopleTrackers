/**
 * Reference data transcribed from V4 spec §6.3, §6.4, §7.
 * Single source of truth — used by the db seed script, the API validators,
 * and the web pickers. Do not duplicate these literals elsewhere.
 */

export const CASE_STATUSES = [
  { code: 'new_instruction', name: 'New Instruction', sortOrder: 1, feeRule: 'zero' },
  { code: 'leads_obtained', name: 'Leads Obtained', sortOrder: 2, feeRule: 'locate_rate' },
  { code: 'non_locate', name: 'Non Locate', sortOrder: 3, feeRule: 'non_locate_rate' },
  { code: 'located', name: 'Located', sortOrder: 4, feeRule: 'locate_rate' },
  { code: 'completed', name: 'Completed', sortOrder: 5, feeRule: 'locate_rate' },
  { code: 'withdrawn', name: 'Withdrawn', sortOrder: 6, feeRule: 'zero' },
  { code: 'credited_disputed', name: 'Credited/Disputed', sortOrder: 7, feeRule: 'zero' },
] as const;

export type CaseStatusCode = (typeof CASE_STATUSES)[number]['code'];
export type FeeRule = (typeof CASE_STATUSES)[number]['feeRule'];

export const CASE_TYPES = [
  { code: 'skip_tracing', name: 'Skip Tracing', usesPackage: true, locateRate: null, nonLocateRate: null, sortOrder: 1 },
  { code: 'process_serving', name: 'Process Serving', usesPackage: false, locateRate: 50, nonLocateRate: 50, sortOrder: 2 },
  { code: 'field_call', name: 'Field Call', usesPackage: false, locateRate: 50, nonLocateRate: 50, sortOrder: 3 },
  { code: 'surveillance', name: 'Surveillance', usesPackage: false, locateRate: 120, nonLocateRate: 120, sortOrder: 4 },
] as const;

export type CaseTypeCode = (typeof CASE_TYPES)[number]['code'];

export const PACKAGES = [
  { code: 'basic', name: 'Basic', locateRate: 7, nonLocateRate: 7, sortOrder: 1 },
  { code: 'flat', name: 'Flat', locateRate: 100, nonLocateRate: 100, sortOrder: 2 },
  { code: 'standard', name: 'Standard', locateRate: 150, nonLocateRate: 50, sortOrder: 3 },
  { code: 'premium', name: 'Premium', locateRate: 400, nonLocateRate: 400, sortOrder: 4 },
  { code: 'custom', name: 'Custom', locateRate: 0, nonLocateRate: 0, sortOrder: 5 },
] as const;

export type PackageCode = (typeof PACKAGES)[number]['code'];

export const SUBJECT_TITLES = ['Mr.', 'Mrs.', 'Ms.', 'Miss.', 'Dr.'] as const;

export const SUBJECT_GENDERS = ['Male', 'Female'] as const;

export const AUSTRALIAN_STATES = [
  'Victoria',
  'Australian Capital Territory',
  'New South Wales',
  'Northern Territory',
  'Queensland',
  'South Australia',
  'Tasmania',
  'Western Australia',
] as const;

export const DEFAULT_COUNTRY = 'Australia';

export const CLIENT_KINDS = [
  'Lawyers',
  'Collections',
  'Private',
  'Investigators',
  'Finance',
  'Professional',
  'Process Servers',
] as const;

export const AGENT_SKILLS = [
  { code: 'skip_tracing', name: 'Skip Tracing' },
  { code: 'process_serving', name: 'Process Serving' },
  { code: 'debt_collection', name: 'Debt Collection' },
] as const;

export type AgentSkillCode = (typeof AGENT_SKILLS)[number]['code'];

/** Case list saved filters — spec §12.2. */
export const CASE_SAVED_FILTERS = [
  { code: 'all', label: 'All' },
  { code: 'new_instruction', label: 'New Instruction' },
  { code: 'to_report', label: 'To Report' },
  { code: 'to_invoice', label: 'To Invoice' },
] as const;

/** Report boilerplate bodies — spec §13.1. Body text is seeded separately (§22 content). */
export const REPORT_TEMPLATES = [
  { code: 'located', buttonLabel: 'Located' },
  { code: 'non_locate', buttonLabel: 'Not Located' },
  { code: 'leads_obtained', buttonLabel: 'Leads Obtained' },
  { code: 'process_service', buttonLabel: 'Process Service' },
  { code: 'field_call', buttonLabel: 'Field Call' },
] as const;

export type ReportTemplateCode = (typeof REPORT_TEMPLATES)[number]['code'];

/** Printable report outputs — spec §13.2. Batch case report (source #12) is the same template as #1. */
export const REPORT_OUTPUTS = [
  { code: 'case_report', label: 'Case Report', scope: ['single', 'batch'] },
  { code: 'update_report', label: 'Update Report', scope: ['single'] },
  { code: 'agent_instruction', label: 'Agent Instruction', scope: ['single'] },
  { code: 'client_status_report', label: 'Client Status Report', scope: ['result_set'] },
  { code: 'file_list_by_agent', label: 'File List by Agent', scope: ['result_set'] },
  { code: 'client_details', label: 'Client Details', scope: ['single'] },
  { code: 'client_list', label: 'Client List', scope: ['result_set'] },
  { code: 'client_envelope', label: 'Client Envelope', scope: ['single'] },
  { code: 'agent_details', label: 'Agent Details', scope: ['single'] },
  { code: 'agent_list', label: 'Agent List', scope: ['result_set'] },
  { code: 'agent_envelope', label: 'Agent Envelope', scope: ['single'] },
] as const;

export const USER_ROLES = ['admin', 'staff'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Case defaults on create — spec §6.1. */
export const DEFAULT_DAYS_UNTIL_DUE = 14;
export const DEFAULT_CASE_TYPE_CODE: CaseTypeCode = 'skip_tracing';
export const DEFAULT_CASE_STATUS_CODE: CaseStatusCode = 'new_instruction';

/** Sequence starting points — spec §6.8, §6.9, §8.6, D9. */
export const CASE_REFERENCE_START = 55982;
export const CLIENT_REFERENCE_NEXT = 2716;
export const AGENT_REFERENCE_NEXT = 1159;
