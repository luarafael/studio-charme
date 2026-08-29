import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AuthenticatedProfessional } from '@studio-charme/contracts';
import { ProfessionalPhoto } from './ProfessionalPhoto';

const clarisse: AuthenticatedProfessional = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'clarisse',
  name: 'Clarisse',
  email: 'clarisse@example.com',
  role: 'Especialista em olhar',
  photoUrl: null,
};

function renderPhoto(professional: AuthenticatedProfessional = clarisse) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProfessionalPhoto professional={professional} />
    </QueryClientProvider>,
  );
}

describe('ProfessionalPhoto', () => {
  it('abre a troca da foto só da profissional logada', () => {
    renderPhoto();
    expect(screen.getByRole('button', { name: 'Alterar sua foto, Clarisse' })).toBeInTheDocument();
  });
});
