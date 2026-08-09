import { z } from 'zod';
import { CLIENT_KINDS, AGENT_SKILLS, type AgentSkillCode } from './reference-data.js';

const AGENT_SKILL_CODES = AGENT_SKILLS.map((s) => s.code) as [AgentSkillCode, ...AgentSkillCode[]];

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
