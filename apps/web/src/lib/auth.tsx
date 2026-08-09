import { createContext, useContext, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '@peopletrackers/shared';
import { apiFetch } from './api-client';

interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  user: SessionUser | null | undefined;
  isLoading: boolean;
  login: (input: { email: string; password: string; totp?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiFetch<{ user: SessionUser | null }>('/auth/me'),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (input: { email: string; password: string; totp?: string }) =>
      apiFetch<{ user: SessionUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], { user: data.user });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiFetch('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], { user: null });
    },
  });

  const value: AuthContextValue = {
    user: meQuery.data?.user,
    isLoading: meQuery.isLoading,
    login: async (input) => {
      await loginMutation.mutateAsync(input);
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
