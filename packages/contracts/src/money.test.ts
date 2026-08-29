import { describe, expect, it } from 'vitest';
import { centsSchema, formatCents, parseCurrencyToCents, percentageOfCents } from './money.js';

describe('parseCurrencyToCents', () => {
  it('interpreta vírgula como separador decimal', () => {
    expect(parseCurrencyToCents('123,45')).toBe(12345);
    expect(parseCurrencyToCents('0,50')).toBe(50);
    expect(parseCurrencyToCents('0,05')).toBe(5);
  });

  it('interpreta ponto como separador decimal', () => {
    expect(parseCurrencyToCents('123.45')).toBe(12345);
  });

  it('ignora símbolo de moeda e espaços', () => {
    expect(parseCurrencyToCents('R$ 1.234,56')).toBe(123456);
    expect(parseCurrencyToCents('  R$89,90  ')).toBe(8990);
  });

  it('trata separador de milhar sem casas decimais', () => {
    expect(parseCurrencyToCents('1.234')).toBe(123400);
    expect(parseCurrencyToCents('12.345.678')).toBe(1234567800);
  });

  it('completa uma única casa decimal', () => {
    expect(parseCurrencyToCents('12,5')).toBe(1250);
  });

  it('trata valor inteiro sem separador', () => {
    expect(parseCurrencyToCents('80')).toBe(8000);
  });

  it('aceita valores negativos para ajustes e estornos', () => {
    expect(parseCurrencyToCents('-45,00')).toBe(-4500);
  });

  it('rejeita entradas vazias ou sem dígitos', () => {
    expect(parseCurrencyToCents('')).toBeNull();
    expect(parseCurrencyToCents('   ')).toBeNull();
    expect(parseCurrencyToCents('abc')).toBeNull();
    expect(parseCurrencyToCents('R$')).toBeNull();
  });

  it('não perde precisão em valores que quebram em ponto flutuante', () => {
    // 0.1 + 0.2 !== 0.3 em float; em centavos a soma é exata.
    expect(parseCurrencyToCents('0,10')! + parseCurrencyToCents('0,20')!).toBe(30);
  });
});

describe('formatCents', () => {
  it('formata centavos como moeda brasileira', () => {
    // O separador de milhar do pt-BR é um espaço não separável em alguns runtimes.
    expect(formatCents(12345).replace(/\s/g, ' ')).toBe('R$ 123,45');
    expect(formatCents(0).replace(/\s/g, ' ')).toBe('R$ 0,00');
    expect(formatCents(5).replace(/\s/g, ' ')).toBe('R$ 0,05');
  });

  it('é o inverso de parseCurrencyToCents', () => {
    for (const cents of [0, 5, 990, 12345, 1234567]) {
      expect(parseCurrencyToCents(formatCents(cents))).toBe(cents);
    }
  });
});

describe('percentageOfCents', () => {
  it('calcula comissão arredondando para o centavo mais próximo', () => {
    expect(percentageOfCents(10000, 40)).toBe(4000);
    expect(percentageOfCents(8990, 50)).toBe(4495);
    // 33% de R$ 89,90 = 2966,7 centavos -> 2967
    expect(percentageOfCents(8990, 33)).toBe(2967);
  });

  it('devolve zero quando o percentual é zero', () => {
    expect(percentageOfCents(15000, 0)).toBe(0);
  });
});

describe('centsSchema', () => {
  it('rejeita valores fracionados, pois centavos são inteiros', () => {
    expect(centsSchema.safeParse(12.5).success).toBe(false);
  });

  it('rejeita valores negativos', () => {
    expect(centsSchema.safeParse(-1).success).toBe(false);
  });

  it('aceita zero e inteiros positivos', () => {
    expect(centsSchema.safeParse(0).success).toBe(true);
    expect(centsSchema.safeParse(8990).success).toBe(true);
  });
});
