import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IosInstallHint } from './IosInstallHint';

vi.mock('@/lib/push', () => ({
  isIosDevice: vi.fn(),
  isStandaloneDisplay: vi.fn(),
}));

import { isIosDevice, isStandaloneDisplay } from '@/lib/push';

describe('IosInstallHint', () => {
  it('explica como instalar no iPhone quando ainda não é app', async () => {
    vi.mocked(isIosDevice).mockReturnValue(true);
    vi.mocked(isStandaloneDisplay).mockReturnValue(false);
    sessionStorage.clear();

    render(<IosInstallHint />);

    expect(
      await screen.findByText(/Adicionar à Tela de Início/i),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ok' }));
    expect(screen.queryByText(/Adicionar à Tela de Início/i)).not.toBeInTheDocument();
  });

  it('não aparece quando o app já está na tela de início', () => {
    vi.mocked(isIosDevice).mockReturnValue(true);
    vi.mocked(isStandaloneDisplay).mockReturnValue(true);
    sessionStorage.clear();

    render(<IosInstallHint />);
    expect(screen.queryByText(/Adicionar à Tela de Início/i)).not.toBeInTheDocument();
  });
});
