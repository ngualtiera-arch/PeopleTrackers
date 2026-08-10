import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';

export interface CompanySettings {
  legalName: string;
  tradingAs: string;
  abn: string;
  secondaryAbn: string;
  acn: string;
  email: string;
  website: string;
  additionalWebsite: string;
  postalAddress: string;
  contactNumber: string;
  confidentialityLine: string;
  officeByAppointmentLine: string;
  logoUrl: string | null;
}

export interface DefaultsSettings {
  defaultAgentId: string | null;
  defaultCaseType: string;
  defaultStatus: string;
  daysUntilDue: number;
}

export interface EmailSettingsValue {
  provider: string | null;
  sendingDomain: string | null;
  fromAddress: string | null;
  replyTo: string | null;
  reportEmailSubject: string;
  reportEmailBody: string;
  agentInstructionSubject: string;
  agentInstructionBody: string;
}

export interface AllSettings {
  company: CompanySettings;
  defaults: DefaultsSettings;
  email: EmailSettingsValue;
}

export interface ReferenceData {
  packages: { id: string; code: string; name: string; locateRate: string; nonLocateRate: string }[];
  caseTypes: { id: string; code: string; name: string; usesPackage: boolean; locateRate: string | null; nonLocateRate: string | null }[];
  caseStatuses: { id: string; code: string; name: string; feeRule: string }[];
}

export interface Sequences {
  caseReference: number;
  clientReference: number;
  agentReference: number;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => apiFetch<AllSettings>('/settings') });
}

export function useUpdateSetting<K extends keyof AllSettings>(key: K) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: AllSettings[K]) => apiFetch(`/settings/${key}`, { method: 'PUT', body: JSON.stringify(value) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export function useReferenceData() {
  return useQuery({ queryKey: ['settings', 'reference-data'], queryFn: () => apiFetch<ReferenceData>('/settings/reference-data') });
}

export function useSequences() {
  return useQuery({ queryKey: ['settings', 'sequences'], queryFn: () => apiFetch<Sequences>('/settings/sequences') });
}

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: () => apiFetch<AppUser[]>('/users') });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; name: string; role: string; password: string }) =>
      apiFetch<AppUser>('/users', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; role?: string; isActive?: boolean }) =>
      apiFetch<AppUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useResetPassword(id: string) {
  return useMutation({
    mutationFn: (password: string) => apiFetch(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
  });
}
