import { z } from 'zod';
import {
  CLIENT_KINDS,
  AGENT_SKILLS,
  CASE_TYPES,
  CASE_STATUSES,
  PACKAGES,
  SUBJECT_TITLES,
  SUBJECT_GENDERS,
  CASE_SAVED_FILTERS,
  type AgentSkillCode,
  type CaseTypeCode,
  type CaseStatusCode,
  type PackageCode,
} from './reference-data.js';

const AGENT_SKILL_CODES = AGENT_SKILLS.map((s) => s.code) as [AgentSkillCode, ...AgentSkillCode[]];
const CASE_TYPE_CODES = CASE_TYPES.map((t) => t.code) as [CaseTypeCode, ...CaseTypeCode[]];
const PACKAGE_CODES = PACKAGES.map((p) => p.code) as [PackageCode, ...PackageCode[]];
const CASE_STATUS_CODES = CASE_STATUSES.map((s) => s.code) as [CaseStatusCode, ...CaseStatusCode[]];
const CASE_SAVED_FILTER_CODES = CASE_SAVED_FILTERS.map((f) => f.code) as [string, ...string[]];

// Address fields are free text, not validated against the state/country value lists at the
// schema level — §7 "Country is not restricted... state is free text" for non-Australian
// records, and D11 means existing data may not conform anyway. The picker in the UI offers
// the value lists; this schema just shapes the payload.
const addressFields = {
  addr1: z.string().trim().max(200).nullable().optional(),
  addr2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(),
  postcode: z.string().trim().max(20).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
};

export const clientCreateSchema = z.object({
  company: z.string().trim().max(200).nullable().optional(),
  contactName: z.string().trim().max(200).nullable().optional(),
  kind: z.enum(CLIENT_KINDS).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  fax: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().max(200).nullable().optional(),
  emailInvoice: z.string().trim().max(200).nullable().optional(),
  emailReports: z.string().trim().max(200).nullable().optional(),
  ...addressFields,
  // Unlike agents, clients.country is NOT NULL in the DB (defaults to 'Australia') — never null, only omitted.
  country: z.string().trim().max(100).optional(),
  // Postal address: omit to copy the physical address on create — §6.8. Provide explicitly to override.
  postalAddr1: z.string().trim().max(200).nullable().optional(),
  postalAddr2: z.string().trim().max(200).nullable().optional(),
  postalCity: z.string().trim().max(100).nullable().optional(),
  postalState: z.string().trim().max(100).nullable().optional(),
  postalPostcode: z.string().trim().max(20).nullable().optional(),
  postalCountry: z.string().trim().max(100).nullable().optional(),
  attention: z.string().trim().max(200).nullable().optional(),
  terms: z.string().trim().max(200).nullable().optional(),
  abn: z.string().trim().max(50).nullable().optional(),
  notes: z.string().nullable().optional(),
  packageCode: z.string().trim().nullable().optional(),
  fileFee: z.number().nullable().optional(),
  locateFee: z.number().nullable().optional(),
  // Omit to copy locateFee on create — §6.8.
  nonLocateFee: z.number().nullable().optional(),
  hourlyFee: z.number().nullable().optional(),
});

export const clientUpdateSchema = clientCreateSchema.partial();

export const clientListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  needsReview: z.coerce.boolean().optional(),
  sort: z.enum(['company', '-company']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const agentCreateSchema = z.object({
  name: z.string().trim().max(200).nullable().optional(),
  company: z.string().trim().max(200).nullable().optional(),
  ...addressFields,
  phone: z.string().trim().max(50).nullable().optional(),
  mobile: z.string().trim().max(50).nullable().optional(),
  fax: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().max(200).nullable().optional(),
  notes: z.string().nullable().optional(),
  rate: z.number().nullable().optional(),
  skills: z.array(z.enum(AGENT_SKILL_CODES)).default([]),
});

export const agentUpdateSchema = agentCreateSchema.partial();

export const agentListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  needsReview: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const caseCreateSchema = z.object({
  clientId: z.string().uuid(),
  agentId: z.string().uuid().nullable().optional(),
  caseTypeCode: z.enum(CASE_TYPE_CODES).optional(), // defaults to skip_tracing — §6.1
  statusCode: z.enum(CASE_STATUS_CODES).optional(), // defaults to new_instruction — §6.1
  clientRef: z.string().trim().max(200).nullable().optional(),
  dateDue: z.string().nullable().optional(), // ISO date string; omit to use date_entered + 14 days — §6.1

  subjectTitle: z.enum(SUBJECT_TITLES).nullable().optional(),
  subjectFirstname: z.string().trim().max(100).nullable().optional(),
  subjectMiddlename: z.string().trim().max(100).nullable().optional(),
  subjectLastname: z.string().trim().max(100).nullable().optional(),
  subjectGender: z.enum(SUBJECT_GENDERS).nullable().optional(),
  subjectDob: z.string().nullable().optional(),
  subjectLicence: z.string().trim().max(100).nullable().optional(),
  subjectPhHome: z.string().trim().max(50).nullable().optional(),
  subjectPhMobile: z.string().trim().max(50).nullable().optional(),
  subjectPhWork: z.string().trim().max(50).nullable().optional(),
  subjectPhOther: z.string().trim().max(50).nullable().optional(),

  // The address the investigation CONFIRMED (source field "Subject Address*") — §5 naming note.
  confirmedAddr1: z.string().trim().max(200).nullable().optional(),
  confirmedAddr2: z.string().trim().max(200).nullable().optional(),
  confirmedCity: z.string().trim().max(100).nullable().optional(),
  confirmedState: z.string().trim().max(100).nullable().optional(),
  confirmedPostcode: z.string().trim().max(20).nullable().optional(),
  confirmedCountry: z.string().trim().max(100).nullable().optional(),

  // The address the CLIENT supplied (source field "Previous Address*") — §5 naming note.
  lastKnownAddr1: z.string().trim().max(200).nullable().optional(),
  lastKnownAddr2: z.string().trim().max(200).nullable().optional(),
  lastKnownCity: z.string().trim().max(100).nullable().optional(),
  lastKnownState: z.string().trim().max(100).nullable().optional(),
  lastKnownPostcode: z.string().trim().max(20).nullable().optional(),
  lastKnownCountry: z.string().trim().max(100).nullable().optional(),

  employer: z.string().trim().max(200).nullable().optional(),
  employerAddr1: z.string().trim().max(200).nullable().optional(),
  employerAddr2: z.string().trim().max(200).nullable().optional(),
  employerCity: z.string().trim().max(100).nullable().optional(),
  employerState: z.string().trim().max(100).nullable().optional(),
  employerPostcode: z.string().trim().max(20).nullable().optional(),
  employerCountry: z.string().trim().max(100).nullable().optional(),
  employerPhone: z.string().trim().max(50).nullable().optional(),
  employerFax: z.string().trim().max(50).nullable().optional(),

  additionalInfo: z.string().nullable().optional(),
  agentNotes: z.string().nullable().optional(),
  report: z.string().nullable().optional(),

  // Editable, but overwritten the next time a trigger field changes — §6.4. Nullable because
  // the web form sends null (not omitted) for a blank numeric field; the engine treats
  // null/undefined the same way (defaults to 1 on create — §6.1).
  units: z.number().positive().nullable().optional(),

  reportSent: z.boolean().optional(),
  invoiced: z.boolean().optional(),
});

export const caseUpdateSchema = caseCreateSchema.partial().extend({
  clientId: z.string().uuid().optional(), // required on create, optional (but still changeable) on update
  rateLocate: z.number().nullable().optional(),
  rateNonLocate: z.number().nullable().optional(),
  fee: z.number().nullable().optional(),
  amount: z.number().nullable().optional(),
  // Manual Package override, update-only — reproduces the source's actual behaviour: pick a
  // different Package from the list, and it sticks until the next Client or Type change
  // recomputes and silently overwrites it (§6.2's "replace existing value" trigger).
  packageCode: z.enum(PACKAGE_CODES).nullable().optional(),
});

export const caseListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  filter: z.enum(CASE_SAVED_FILTER_CODES).default('all'), // §12.2
  sort: z.enum(['client', 'reference', 'dateDue', 'status', '-client', '-reference', '-dateDue', '-status']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const copyTemplateSchema = z.object({
  templateCode: z.enum(['located', 'non_locate', 'leads_obtained', 'process_service', 'field_call']),
  confirmReplace: z.boolean().optional(), // required true if the report field is already non-empty — §6.7
});
