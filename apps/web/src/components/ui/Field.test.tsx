import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from './Field';
import { Input } from './Input';

describe('Field', () => {
  it('associa o label ao campo pelo id gerado', () => {
    render(<Field label="Seu nome">{(props) => <Input {...props} />}</Field>);

    // getByLabelText só encontra o campo se a associação existir de verdade.
    expect(screen.getByLabelText('Seu nome')).toBeInTheDocument();
  });

  it('marca o campo como obrigatório para leitores de tela', () => {
    render(
      <Field label="WhatsApp" required>
        {(props) => <Input {...props} />}
      </Field>,
    );

    const input = screen.getByLabelText(/WhatsApp/);
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(screen.getByText('(obrigatório)')).toBeInTheDocument();
  });

  it('liga a dica ao campo por aria-describedby', () => {
    render(
      <Field label="WhatsApp" hint="Com DDD.">
        {(props) => <Input {...props} />}
      </Field>,
    );

    expect(screen.getByLabelText('WhatsApp')).toHaveAccessibleDescription('Com DDD.');
  });

  it('anuncia o erro junto com o campo e o marca como inválido', () => {
    render(
      <Field label="WhatsApp" error="Informe um telefone válido.">
        {(props) => <Input {...props} />}
      </Field>,
    );

    const input = screen.getByLabelText('WhatsApp');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Informe um telefone válido.');
  });

  it('descreve dica e erro ao mesmo tempo', () => {
    render(
      <Field label="WhatsApp" hint="Com DDD." error="Telefone inválido.">
        {(props) => <Input {...props} />}
      </Field>,
    );

    expect(screen.getByLabelText('WhatsApp')).toHaveAccessibleDescription(
      'Com DDD. Telefone inválido.',
    );
  });

  it('não define aria-invalid quando não há erro', () => {
    render(<Field label="Seu nome">{(props) => <Input {...props} />}</Field>);
    expect(screen.getByLabelText('Seu nome')).not.toHaveAttribute('aria-invalid');
  });
});
