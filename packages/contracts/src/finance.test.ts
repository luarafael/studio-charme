import { describe, expect, it } from 'vitest';
import { paymentExceedsDue, remainingDueCents } from './finance.js';

describe('remainingDueCents', () => {
  it('desconta pagamentos pagos e parciais, ignorando estorno', () => {
    expect(
      remainingDueCents(10_000, [
        { amountCents: 4_000, discountCents: 0, status: 'PAID' },
        { amountCents: 2_000, discountCents: 500, status: 'PARTIAL' },
        { amountCents: 1_000, discountCents: 0, status: 'REFUNDED' },
      ]),
    ).toBe(4_500);
  });

  it('nunca fica negativo', () => {
    expect(
      remainingDueCents(1_000, [{ amountCents: 1_000, discountCents: 0, status: 'PAID' }]),
    ).toBe(0);
  });
});

describe('paymentExceedsDue', () => {
  it('bloqueia soma acima do valor do atendimento', () => {
    expect(paymentExceedsDue(10_000, 8_000, 2_001)).toBe(true);
    expect(paymentExceedsDue(10_000, 8_000, 2_000)).toBe(false);
  });
});
