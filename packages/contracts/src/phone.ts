import { z } from 'zod';

/** DDDs válidos no Brasil (Anatel). Evita aceitar telefones impossíveis. */
const VALID_AREA_CODES = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43,
  44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77,
  79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * Normaliza um telefone brasileiro para o formato E.164 sem "+": 55DDDNNNNNNNNN.
 * Retorna null quando o número não é um telefone brasileiro válido.
 *
 * Essa forma normalizada é a chave usada para detectar clientes duplicadas,
 * então precisa ser estável para as várias formas de digitação.
 */
export function normalizeBrazilianPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits === '') return null;

  // Remove o prefixo internacional do Brasil quando presente.
  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  // Remove o zero de operadora usado em discagem interurbana (ex.: 085...).
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10 && digits.length !== 11) return null;

  const areaCode = Number(digits.slice(0, 2));
  if (!VALID_AREA_CODES.has(areaCode)) return null;

  const subscriber = digits.slice(2);

  if (subscriber.length === 9) {
    // Celular: precisa começar com 9.
    if (!subscriber.startsWith('9')) return null;
  } else {
    // Fixo: primeiro dígito entre 2 e 5.
    const first = subscriber.charAt(0);
    if (!['2', '3', '4', '5'].includes(first)) return null;
  }

  // Rejeita sequências repetidas como 85999999999.
  if (/^(\d)\1+$/.test(subscriber)) return null;

  return `55${digits}`;
}

/** Formata o telefone normalizado para exibição: "(85) 99202-9844". */
export function formatBrazilianPhone(normalized: string): string {
  const digits = normalized.replace(/\D/g, '').replace(/^55/, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return normalized;
}

/** Máscara progressiva para uso em inputs controlados. */
export function maskBrazilianPhone(input: string): string {
  const digits = input
    .replace(/\D/g, '')
    .replace(/^55(?=\d{10,11}$)/, '')
    .slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Aceita qualquer forma de digitação e devolve sempre o formato normalizado,
 * de modo que a API e o banco nunca guardem variações do mesmo número.
 */
export const brazilianPhoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizeBrazilianPhone(value);
    if (normalized === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Informe um telefone brasileiro válido com DDD.',
      });
      return z.NEVER;
    }
    return normalized;
  });

export const optionalBrazilianPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === '') return undefined;
    const normalized = normalizeBrazilianPhone(value);
    if (normalized === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Informe um telefone brasileiro válido com DDD.',
      });
      return z.NEVER;
    }
    return normalized;
  });
