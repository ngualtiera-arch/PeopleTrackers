import type { UserRole, CaseTypeCode, CaseStatusCode, PackageCode, AgentSkillCode } from './reference-data.js';

export interface Address {
  addr1: string | null;
  addr2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client extends Address {
  id: string;
  reference: number;
  company: string | null;
  contactName: string | null;
  kind: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  emailInvoice: string | null;
  emailReports: string | null;
  postalAddr1: string | null;
  postalAddr2: string | null;
  postalCity: string | null;
  postalState: string | null;
  postalPostcode: string | null;
  postalCountry: string | null;
  attention: string | null;
  terms: string | null;
  abn: string | null;
  notes: string | null;
  packageId: string | null;
  fileFee: number | null;
  locateFee: number | null;
  nonLocateFee: number | null;
  hourlyFee: number | null;
  needsReview: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface Agent extends Address {
  id: string;
  reference: number;
  name: string | null;
  company: string | null;
  phone: string | null;
  mobile: string | null; // stored, not displayed — D13
  fax: string | null;
  email: string | null;
  notes: string | null;
  rate: number | null; // stored, not displayed — D13
  skills: AgentSkillCode[];
  needsReview: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface Case {
  id: string;
  reference: number;
  clientId: string;
  agentId: string | null;
  caseTypeCode: CaseTypeCode;
  statusCode: CaseStatusCode;
  packageCode: PackageCode | null;
  clientRef: string | null;
  rateLocate: number | null;
  rateNonLocate: number | null;
  fee: number | null;
  units: number;
  amount: number | null;
  dateEntered: string;
  dateDue: string | null;
  dateClosed: string | null;
  dateInstructionSent: string | null;
  reportSent: boolean;
  invoiced: boolean;

  subjectTitle: string | null;
  subjectFirstname: string | null;
  subjectMiddlename: string | null;
  subjectLastname: string | null;
  subjectGender: string | null;
  subjectDob: string | null;
  subjectLicence: string | null;
  subjectPhHome: string | null;
  subjectPhMobile: string | null;
  subjectPhWork: string | null;
  subjectPhOther: string | null;

  confirmedAddr1: string | null;
  confirmedAddr2: string | null;
  confirmedCity: string | null;
  confirmedState: string | null;
  confirmedPostcode: string | null;
  confirmedCountry: string | null;

  lastKnownAddr1: string | null;
  lastKnownAddr2: string | null;
  lastKnownCity: string | null;
  lastKnownState: string | null;
  lastKnownPostcode: string | null;
  lastKnownCountry: string | null;

  employer: string | null;
  employerAddr1: string | null;
  employerAddr2: string | null;
  employerCity: string | null;
  employerState: string | null;
  employerPostcode: string | null;
  employerCountry: string | null;
  employerPhone: string | null;
  employerFax: string | null;

  additionalInfo: string | null;
  agentNotes: string | null;
  report: string | null;

  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}
