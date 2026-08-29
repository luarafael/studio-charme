import { describe, expect, it } from 'vitest';
import { paymentSituationLabel } from './paymentSituation';

describe('paymentSituationLabel', () => {
  it('mostra pago e não pago nos status principais', () => {
    expect(paymentSituationLabel('PENDING')).toBe('Não pago');
    expect(paymentSituationLabel('PAID')).toBe('Pago');
  });
});
