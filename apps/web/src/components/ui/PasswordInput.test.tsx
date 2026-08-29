import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
  it('mostra e oculta a senha ao clicar no olho', async () => {
    const user = userEvent.setup();
    render(
      <label>
        Senha
        <PasswordInput />
      </label>,
    );

    const input = screen.getByLabelText('Senha');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('não envia o formulário ao clicar no olho', async () => {
    const user = userEvent.setup();
    let submitted = false;
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted = true;
        }}
      >
        <label>
          Senha
          <PasswordInput />
        </label>
        <button type="submit">Salvar</button>
      </form>,
    );

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(submitted).toBe(false);
  });
});
