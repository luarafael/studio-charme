import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IsoDate } from '@studio-charme/contracts';
import { DatePicker } from './DatePicker';

function DatePickerHarness({
  initial = null,
  minDate,
  isDateDisabled,
  onChange,
}: {
  initial?: IsoDate | null;
  minDate?: IsoDate;
  isDateDisabled?: (date: IsoDate) => boolean;
  onChange?: (date: IsoDate) => void;
}) {
  const [value, setValue] = useState<IsoDate | null>(initial);

  return (
    <DatePicker
      value={value}
      onChange={(date) => {
        setValue(date);
        onChange?.(date);
      }}
      minDate={minDate}
      isDateDisabled={isDateDisabled}
      label="Escolha a data do atendimento"
    />
  );
}

describe('DatePicker', () => {
  it('expõe uma grade com nome acessível', () => {
    render(<DatePickerHarness initial="2026-08-15" />);
    expect(screen.getByRole('grid', { name: 'Escolha a data do atendimento' })).toBeInTheDocument();
  });

  it('mostra o mês da data selecionada', () => {
    render(<DatePickerHarness initial="2026-08-15" />);
    expect(screen.getByText('Agosto de 2026')).toBeInTheDocument();
  });

  it('rotula cada dia com a data completa em português', () => {
    render(<DatePickerHarness initial="2026-08-15" />);
    // 15 de agosto de 2026 é um sábado.
    expect(
      screen.getByRole('button', { name: '15 de agosto de 2026, sábado' }),
    ).toBeInTheDocument();
  });

  it('seleciona a data ao clicar', async () => {
    const onChange = vi.fn();
    render(<DatePickerHarness initial="2026-08-15" onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /^20 de agosto de 2026/ }));
    expect(onChange).toHaveBeenCalledWith('2026-08-20');
  });

  it('desabilita datas anteriores à mínima', () => {
    render(<DatePickerHarness initial="2026-08-15" minDate="2026-08-10" />);

    expect(screen.getByRole('button', { name: /^9 de agosto de 2026/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^10 de agosto de 2026/ })).toBeEnabled();
  });

  it('desabilita datas bloqueadas pela regra recebida', () => {
    // Domingo é dia de folga no calendário do salão anterior.
    render(
      <DatePickerHarness
        initial="2026-08-15"
        isDateDisabled={(date) => new Date(`${date}T12:00:00Z`).getUTCDay() === 0}
      />,
    );

    // 16 de agosto de 2026 é domingo; 17 é segunda.
    expect(screen.getByRole('button', { name: /^16 de agosto de 2026/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^17 de agosto de 2026/ })).toBeEnabled();
  });

  it('mantém apenas um dia na ordem de tabulação', () => {
    render(<DatePickerHarness initial="2026-08-15" />);

    const focusable = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('tabindex') === '0');
    expect(focusable).toHaveLength(1);
  });

  it('navega entre os dias com as setas do teclado', async () => {
    render(<DatePickerHarness initial="2026-08-15" />);

    const selected = screen.getByRole('button', { name: /^15 de agosto de 2026/ });
    selected.focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /^16 de agosto de 2026/ })).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: /^23 de agosto de 2026/ })).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: /^22 de agosto de 2026/ })).toHaveFocus();
  });

  it('troca de mês ao atravessar o limite com a seta', async () => {
    render(<DatePickerHarness initial="2026-08-31" />);

    screen.getByRole('button', { name: /^31 de agosto de 2026/ }).focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByText('Setembro de 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^1 de setembro de 2026/ })).toHaveFocus();
  });

  it('avança e volta o mês pelos botões', async () => {
    render(<DatePickerHarness initial="2026-08-15" />);

    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByText('Setembro de 2026')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByText('Agosto de 2026')).toBeInTheDocument();
  });

  it('impede voltar antes do mês da data mínima', async () => {
    render(<DatePickerHarness initial="2026-08-15" minDate="2026-08-01" />);
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeDisabled();
  });

  it('posiciona o primeiro dia do mês na coluna correta', () => {
    // 1º de agosto de 2026 é um sábado, então há 6 células vazias antes dele.
    render(<DatePickerHarness initial="2026-08-15" />);

    const cells = screen.getByRole('grid').querySelectorAll('[role="gridcell"]');
    const blanks = Array.from(cells).filter((cell) => cell.getAttribute('aria-hidden') === 'true');
    expect(blanks).toHaveLength(6);
  });
});
