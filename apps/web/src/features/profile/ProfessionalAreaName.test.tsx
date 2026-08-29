import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AuthenticatedProfessional } from '@studio-charme/contracts';
import { ProfessionalAreaName } from './ProfessionalAreaName';

const clarisse: AuthenticatedProfessional = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'clarisse',
  name: 'Clarisse',
  email: 'clarisse@example.com',
  role: 'Especialista em olhar',
  photoUrl: null,
};

describe('ProfessionalAreaName', () => {
  it('mostra o nome da profissional logada e permite alterar', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <ProfessionalAreaName professional={clarisse} />
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole('button', { name: 'Alterar o nome da área, hoje Clarisse' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Clarisse')).toBeInTheDocument();
  });
});
