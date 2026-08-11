import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import type { CaseListResponse, CaseWithRelations } from './types';

export interface CaseListParams {
  search?: string;
  filter?: 'all' | 'new_instruction' | 'to_report' | 'to_invoice';
  sort?: string;
  page?: number;
}

function toQueryString(params: CaseListParams): string {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.filter) q.set('filter', params.filter);
  if (params.sort) q.set('sort', params.sort);
  if (params.page) q.set('page', String(params.page));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function useCasesList(params: CaseListParams) {
  return useQuery({
    queryKey: ['cases', params],
    queryFn: () => apiFetch<CaseListResponse>(`/cases${toQueryString(params)}`),
    placeholderData: (prev) => prev,
  });
}

export function useCase(id: string | undefined) {
  return useQuery({
    queryKey: ['cases', 'detail', id],
    queryFn: () => apiFetch<CaseWithRelations>(`/cases/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<CaseWithRelations>('/cases', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cases'] }),
  });
}

export function useUpdateCase(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<CaseWithRelations>(`/cases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cases'] }),
  });
}

export function useDeleteCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      apiFetch<void>(`/cases/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cases'] }),
  });
}

export function useCopyTemplate(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { templateCode: string; confirmReplace?: boolean }) =>
      apiFetch<CaseWithRelations>(`/cases/${caseId}/copy-template`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cases'] }),
  });
}
