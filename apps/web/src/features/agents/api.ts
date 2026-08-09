import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import type { AgentListResponse, AgentWithSkills } from './types';

export interface AgentListParams {
  search?: string;
  needsReview?: boolean;
  page?: number;
}

function toQueryString(params: AgentListParams): string {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.needsReview) q.set('needsReview', 'true');
  if (params.page) q.set('page', String(params.page));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function useAgentsList(params: AgentListParams) {
  return useQuery({
    queryKey: ['agents', params],
    queryFn: () => apiFetch<AgentListResponse>(`/agents${toQueryString(params)}`),
    placeholderData: (prev) => prev,
  });
}

export function useAgent(id: string | undefined) {
  return useQuery({
    queryKey: ['agents', 'detail', id],
    queryFn: () => apiFetch<AgentWithSkills>(`/agents/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<AgentWithSkills>('/agents', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useUpdateAgent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<AgentWithSkills>(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/agents/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}
