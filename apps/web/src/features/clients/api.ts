import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import type { ClientListResponse, ClientWithPackage } from './types';

export interface ClientListParams {
  search?: string;
  needsReview?: boolean;
  sort?: 'company' | '-company';
  page?: number;
}

function toQueryString(params: ClientListParams): string {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.needsReview) q.set('needsReview', 'true');
  if (params.sort) q.set('sort', params.sort);
  if (params.page) q.set('page', String(params.page));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function useClientsList(params: ClientListParams) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => apiFetch<ClientListResponse>(`/clients${toQueryString(params)}`),
    placeholderData: (prev) => prev,
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ['clients', 'detail', id],
    queryFn: () => apiFetch<ClientWithPackage>(`/clients/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<ClientWithPackage>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useUpdateClient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<ClientWithPackage>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/clients/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}
