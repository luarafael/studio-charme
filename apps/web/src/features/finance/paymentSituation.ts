import { PAYMENT_STATUS_LABELS, type PaymentStatus } from '@studio-charme/contracts';
import type { BadgeTone } from '@/components/ui/Badge';

export function paymentSituationLabel(status: PaymentStatus): string {
  if (status === 'PENDING') return 'Não pago';
  if (status === 'PAID') return 'Pago';
  return PAYMENT_STATUS_LABELS[status];
}

export function paymentSituationTone(status: PaymentStatus): BadgeTone {
  if (status === 'PENDING') return 'warning';
  if (status === 'PAID') return 'success';
  if (status === 'REFUNDED') return 'neutral';
  return 'info';
}
