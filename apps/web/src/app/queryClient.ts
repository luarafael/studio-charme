import { QueryClient } from '@tanstack/react-query';

/**
 * Cache compartilhado da aplicação.
 *
 * `retry` ignora erros 4xx: repetir uma requisição rejeitada por validação,
 * permissão ou sessão expirada só atrasa o feedback para a usuária.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const status = (error as { status?: number }).status;
          if (typeof status === 'number' && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
