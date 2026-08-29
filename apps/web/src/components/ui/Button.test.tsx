import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('usa type="button" por padrão, evitando submit acidental', () => {
    // Um botão sem type dentro de um formulário envia o formulário ao ser
    // clicado, o que já causou envios indesejados no site anterior.
    render(<Button>Salvar</Button>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('type', 'button');
  });

  it('permite declarar type="submit" explicitamente', () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveAttribute('type', 'submit');
  });

  it('fica desabilitado e anuncia o carregamento', () => {
    render(
      <Button isLoading loadingLabel="Enviando solicitação">
        Enviar
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Enviando solicitação')).toBeInTheDocument();
  });

  it('não dispara onClick enquanto carrega', async () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Enviar
      </Button>,
    );

    await userEvent.click(screen.getByRole('button'), { pointerEventsCheck: 0 });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('dispara onClick quando habilitado', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Agendar</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Agendar' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('permite que className sobrescreva o estilo da variante', () => {
    render(<Button className="bg-white">Custom</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-white');
    expect(button.className).not.toContain('bg-gold-500');
  });
});
