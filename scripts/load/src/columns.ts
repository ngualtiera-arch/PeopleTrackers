/**
 * Column layout of export_clients.csv (38 cols) and export_agents.csv (21 cols).
 *
 * The CSVs have no header row. This mapping was derived empirically by cross-checking
 * column contents against facts stated in spec §8.2-§8.5 (e.g. "only 2 of 689 clients
 * carry a package, both Standard" landed on column 35; "Referrer is empty on all 689
 * records" landed on column 16; "1 invalid email_reports value" landed on column 27) —
 * NOT from the spec's prose field-listing order, which does not match the physical
 * column order in the actual export. Re-verify against `docs/PeopleTrackers_V1_Build_Specification.md`
 * §8.7's spot-check (20 clients, 5 agents) before trusting this for the production load.
 */

export const CLIENT_COLUMNS = {
  reference: 0,
  createdAt: 1,
  contactName: 2,
  company: 3,
  addr1: 4,
  addr2: 5,
  city: 6,
  state: 7,
  postcode: 8,
  country: 9,
  phone: 10,
  fax: 11,
  email: 12,
  notes: 13,
  // 14: zcalc_Address (computed) — not loaded
  kind: 15,
  // 16: Referrer — empty on all 689 records, not loaded
  updatedBy: 17,
  updatedAt: 18,
  postalAddr1: 19,
  postalAddr2: 20,
  postalCity: 21,
  postalState: 22,
  postalPostcode: 23,
  postalCountry: 24,
  attention: 25,
  emailInvoice: 26,
  emailReports: 27,
  terms: 28,
  fileFee: 29,
  locateFee: 30,
  nonLocateFee: 31,
  hourlyFee: 32,
  abn: 33,
  // 34: calc_Found (computed) — not loaded
  package: 35,
  // 36, 37: Account Name / Account Password — client-portal credentials, not loaded
} as const;

export const CLIENT_COLUMN_COUNT = 38;

export const AGENT_COLUMNS = {
  reference: 0,
  createdAt: 1,
  name: 2,
  company: 3,
  addr1: 4,
  addr2: 5,
  city: 6,
  state: 7,
  postcode: 8,
  country: 9,
  // 10: zcalc_Address (computed) — not loaded
  phone: 11,
  mobile: 12,
  fax: 13,
  email: 14,
  notes: 15,
  skills: 16,
  rate: 17,
  updatedBy: 18,
  updatedAt: 19,
  // 20: calc_Found (computed) — not loaded
} as const;

export const AGENT_COLUMN_COUNT = 21;
