import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '@/features/auth/AuthProvider';
import LoginPage from './LoginPage';

function renderLogin() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LoginPage', () => {
  it('pede e-mail e senha sem listar as contas das profissionais', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url.includes('/auth/me')) {
          return new Response(
            JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Faça login para continuar.' } }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          );
        }
        throw new Error(`Fetch inesperado: ${url}`);
      }),
    );

    renderLogin();

    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^E-mail/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Senha/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeInTheDocument();

    const html = document.body.textContent ?? '';
    expect(html).not.toMatch(/clarissemendes1607/i);
    expect(html).not.toMatch(/catundacibele/i);
    expect(html).not.toMatch(/liviamariaazevedomendes/i);

    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
        'noindex, nofollow',
      );
    });
  });
});
