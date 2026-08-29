import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';
import { Button } from './Button';

function ModalHarness({ dismissible = true }: { dismissible?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Confirmar agendamento"
        description="Revise os dados antes de enviar."
        dismissible={dismissible}
        footer={<Button onClick={() => setOpen(false)}>Confirmar</Button>}
      >
        <input aria-label="Observação" />
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('não renderiza nada quando fechado', () => {
    render(<ModalHarness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('expõe o diálogo com nome e descrição acessíveis', async () => {
    render(<ModalHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Confirmar agendamento');
    expect(dialog).toHaveAccessibleDescription('Revise os dados antes de enviar.');
  });

  it('move o foco para o primeiro campo ao abrir, não para o botão Fechar', async () => {
    render(<ModalHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(screen.getByLabelText('Observação')).toHaveFocus();
  });

  it('mantém o foco no campo enquanto o formulário re-renderiza a cada tecla', async () => {
    function TypingHarness() {
      const [open, setOpen] = useState(true);
      const [value, setValue] = useState('');

      return (
        <Modal open={open} onClose={() => setOpen(false)} title="Novo atendimento">
          <input
            aria-label="Nome"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Modal>
      );
    }

    render(<TypingHarness />);
    const input = screen.getByLabelText('Nome');
    await userEvent.click(input);
    await userEvent.type(input, 'Maria');

    expect(input).toHaveFocus();
    expect(input).toHaveValue('Maria');
  });

  it('fecha com a tecla Esc', async () => {
    render(<ModalHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('devolve o foco a quem abriu ao fechar', async () => {
    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Abrir' });

    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');

    expect(trigger).toHaveFocus();
  });

  it('prende o foco dentro do diálogo ao tabular', async () => {
    render(<ModalHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    const dialog = screen.getByRole('dialog');

    // Percorre mais elementos do que o diálogo contém: o foco precisa dar a
    // volta em vez de escapar para o botão que está atrás da sobreposição.
    for (let index = 0; index < 8; index += 1) {
      await userEvent.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('não fecha com Esc quando não é dispensável', async () => {
    render(<ModalHarness dismissible={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('não exibe o botão de fechar quando não é dispensável', async () => {
    render(<ModalHarness dismissible={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument();
  });

  it('bloqueia a rolagem do fundo enquanto aberto', async () => {
    render(<ModalHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(document.body.dataset.scrollLocked).toBe('true');

    await userEvent.keyboard('{Escape}');
    expect(document.body.dataset.scrollLocked).toBeUndefined();
  });

  it('expõe apenas um botão "Fechar" para a tecnologia assistiva', async () => {
    render(<ModalHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    // O fundo clicável não deve ser anunciado como um segundo botão "Fechar".
    expect(screen.getAllByRole('button', { name: 'Fechar' })).toHaveLength(1);
  });

  it('chama onClose ao clicar no fundo', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Teste">
        <p>Conteúdo</p>
      </Modal>,
    );

    await userEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('não fecha ao clicar no fundo quando não é dispensável', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Teste" dismissible={false}>
        <p>Conteúdo</p>
      </Modal>,
    );

    await userEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
