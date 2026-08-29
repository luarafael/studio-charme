import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AppointmentDetailDto } from '@studio-charme/contracts';
import { AppointmentDetailContent } from './AppointmentDetailModal';

const appointment: AppointmentDetailDto = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'COMPLETED',
  source: 'INTERNAL',
  startsAt: '2026-08-20T17:00:00.000Z',
  endsAt: '2026-08-20T18:00:00.000Z',
  blockedUntil: '2026-08-20T18:00:00.000Z',
  totalPriceCents: 12000,
  notes: 'Preferiu esmalte nude.',
  clientNotes: null,
  client: {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Maria Silva',
    phone: '5585991234567',
  },
  services: [
    {
      serviceId: '33333333-3333-4333-8333-333333333333',
      name: 'Manicure',
      durationMinutes: 60,
      priceCents: 12000,
    },
  ],
  payments: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      amountCents: 12000,
      discountCents: 0,
      netCents: 12000,
      method: 'PIX',
      status: 'PAID',
      paidOn: '2026-08-20',
    },
  ],
};

describe('AppointmentDetailContent', () => {
  it('mostra cliente, serviço e valor do atendimento', () => {
    render(<AppointmentDetailContent appointment={appointment} />);

    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Manicure')).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s*120,00/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Preferiu esmalte nude.')).toBeInTheDocument();
    expect(screen.getByText('Pix')).toBeInTheDocument();
  });
});
