import { createContext, useContext, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type AuthenticatedProfessional,
  type LoginInput,
  type SessionResponse,
} from '@studio-charme/contracts';
import { api, ApiClientError, ensureCsrfToken, setCsrfToken } from '@/lib/api';

export const AUTH_SESSION_KEY = ['auth', 'me'] as const;

async function fetchSession(): Promise<AuthenticatedProfessional | null> {
  try {
    const data = await api<SessionResponse>('/auth/me');
    // Depois de recarregar a página o token CSRF some da memória; sem ele as
    // mutações (agenda, clientes) falhariam mesmo com a sessão válida.
    await ensureCsrfToken().catch(() => undefined);
    return data.professional;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) return null;
    throw error;
  }
}

type AuthContextValue = {
  professional: AuthenticatedProfessional | null | undefined;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: AUTH_SESSION_KEY,
    queryFn: fetchSession,
    retry: false,
    staleTime: 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const data = await api<SessionResponse & { csrfToken: string }>('/auth/login', {
        method: 'POST',
        body: input,
      });
      setCsrfToken(data.csrfToken);
      return data.professional;
    },
    onSuccess: (professional) => {
      queryClient.setQueryData(AUTH_SESSION_KEY, professional);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api('/auth/logout', { method: 'POST' });
      setCsrfToken(null);
    },
    onSuccess: () => {
      queryClient.setQueryData(AUTH_SESSION_KEY, null);
      void queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
    },
  });

  const value: AuthContextValue = {
    professional: sessionQuery.data,
    isLoading: sessionQuery.isLoading,
    login: async (input) => {
      await loginMutation.mutateAsync(input);
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider.');
  return context;
}

export function useEnsureCsrf(): typeof ensureCsrfToken {
  return ensureCsrfToken;
}
