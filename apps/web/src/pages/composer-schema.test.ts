import { describe, expect, it } from 'vitest';

describe('páginas que montam formulários com Zod', () => {
  it('carrega a agenda sem .omit() em schema com refine', async () => {
    const { default: AgendaPage } = await import('./AgendaPage');
    expect(typeof AgendaPage).toBe('function');
  });

  it('carrega o financeiro sem .omit() em schema com refine', async () => {
    const { default: FinancePage } = await import('./FinancePage');
    expect(typeof FinancePage).toBe('function');
  });
});
