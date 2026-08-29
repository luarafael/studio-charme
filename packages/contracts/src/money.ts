import { z } from 'zod';

/**
 * Todos os valores monetários do sistema circulam como inteiros em centavos.
 * Nunca usar float para dinheiro: 0.1 + 0.2 !== 0.3 em ponto flutuante.
 */
export const centsSchema = z
  .number()
  .int('O valor deve ser um número inteiro de centavos.')
  .min(0, 'O valor não pode ser negativo.')
  .max(100_000_000, 'O valor excede o limite permitido.');

/** Centavos que podem ser negativos (ajustes, estornos, saldo). */
export const signedCentsSchema = z
  .number()
  .int('O valor deve ser um número inteiro de centavos.')
  .min(-100_000_000)
  .max(100_000_000);

export type Cents = z.infer<typeof centsSchema>;

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Formata centavos como moeda brasileira: 12345 -> "R$ 123,45". */
export function formatCents(cents: number): string {
  return BRL_FORMATTER.format(cents / 100);
}

/**
 * Converte texto digitado pela usuária em centavos.
 * Aceita "123,45", "123.45", "R$ 1.234,56" e "1234".
 * Retorna null quando a entrada não representa um valor válido.
 */
export function parseCurrencyToCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  const digitsAndSeparators = trimmed.replace(/[^\d,.-]/g, '');
  if (digitsAndSeparators === '') return null;

  const isNegative = digitsAndSeparators.startsWith('-');
  const unsigned = digitsAndSeparators.replace(/-/g, '');

  // O último separador é o decimal; os anteriores são de milhar.
  const lastComma = unsigned.lastIndexOf(',');
  const lastDot = unsigned.lastIndexOf('.');
  const decimalIndex = Math.max(lastComma, lastDot);

  let integerPart: string;
  let decimalPart: string;

  if (decimalIndex === -1) {
    integerPart = unsigned;
    decimalPart = '';
  } else {
    const candidateDecimals = unsigned.slice(decimalIndex + 1);
    // Mais de 2 casas após o separador indica separador de milhar (ex.: "1.234").
    if (candidateDecimals.length > 2 || candidateDecimals.length === 0) {
      integerPart = unsigned;
      decimalPart = '';
    } else {
      integerPart = unsigned.slice(0, decimalIndex);
      decimalPart = candidateDecimals;
    }
  }

  const integerDigits = integerPart.replace(/\D/g, '');
  const decimalDigits = decimalPart.replace(/\D/g, '').padEnd(2, '0').slice(0, 2);

  if (integerDigits === '' && decimalDigits === '') return null;

  const cents = Number(integerDigits || '0') * 100 + Number(decimalDigits || '0');
  if (!Number.isFinite(cents)) return null;

  return isNegative ? -cents : cents;
}

/** Divide centavos por um percentual sem perder centavos por arredondamento. */
export function percentageOfCents(cents: number, percentage: number): number {
  return Math.round((cents * percentage) / 100);
}
