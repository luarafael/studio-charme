import { describe, expect, it } from 'vitest';
import {
  brazilianPhoneSchema,
  formatBrazilianPhone,
  maskBrazilianPhone,
  normalizeBrazilianPhone,
} from './phone.js';

describe('normalizeBrazilianPhone', () => {
  it('normaliza as várias formas de digitar o mesmo celular', () => {
    // Todas estas são o WhatsApp real da Lívia e precisam gerar a mesma chave,
    // senão a mesma cliente entraria duplicada no cadastro.
    const expected = '5585992029844';
    expect(normalizeBrazilianPhone('85992029844')).toBe(expected);
    expect(normalizeBrazilianPhone('(85) 99202-9844')).toBe(expected);
    expect(normalizeBrazilianPhone('85 9 9202 9844')).toBe(expected);
    expect(normalizeBrazilianPhone('+55 85 99202-9844')).toBe(expected);
    expect(normalizeBrazilianPhone('5585992029844')).toBe(expected);
    expect(normalizeBrazilianPhone('085992029844')).toBe(expected);
  });

  it('aceita telefone fixo com oito dígitos', () => {
    expect(normalizeBrazilianPhone('(85) 3232-1010')).toBe('558532321010');
  });

  it('rejeita DDD inexistente', () => {
    expect(normalizeBrazilianPhone('(00) 99999-1234')).toBeNull();
    expect(normalizeBrazilianPhone('(20) 99999-1234')).toBeNull();
  });

  it('rejeita celular que não começa com 9', () => {
    expect(normalizeBrazilianPhone('85 89202-9844')).toBeNull();
  });

  it('rejeita fixo com primeiro dígito inválido', () => {
    expect(normalizeBrazilianPhone('85 1232-1010')).toBeNull();
    expect(normalizeBrazilianPhone('85 9232-101')).toBeNull();
  });

  it('rejeita sequências repetidas usadas como preenchimento', () => {
    expect(normalizeBrazilianPhone('85 99999-9999')).toBeNull();
    expect(normalizeBrazilianPhone('85 33333-3333')).toBeNull();
  });

  it('rejeita quantidade de dígitos inválida', () => {
    expect(normalizeBrazilianPhone('')).toBeNull();
    expect(normalizeBrazilianPhone('9202')).toBeNull();
    expect(normalizeBrazilianPhone('859920298440000')).toBeNull();
  });
});

describe('formatBrazilianPhone', () => {
  it('formata celular e fixo para exibição', () => {
    expect(formatBrazilianPhone('5585992029844')).toBe('(85) 99202-9844');
    expect(formatBrazilianPhone('558532321010')).toBe('(85) 3232-1010');
  });
});

describe('maskBrazilianPhone', () => {
  it('aplica a máscara progressivamente conforme a digitação', () => {
    expect(maskBrazilianPhone('8')).toBe('8');
    expect(maskBrazilianPhone('85')).toBe('85');
    expect(maskBrazilianPhone('859')).toBe('(85) 9');
    expect(maskBrazilianPhone('85992')).toBe('(85) 992');
    expect(maskBrazilianPhone('8599202')).toBe('(85) 9920-2');
    expect(maskBrazilianPhone('85992029844')).toBe('(85) 99202-9844');
  });

  it('descarta dígitos além do limite de um telefone brasileiro', () => {
    expect(maskBrazilianPhone('85992029844999')).toBe('(85) 99202-9844');
  });
});

describe('brazilianPhoneSchema', () => {
  it('devolve sempre o formato normalizado', () => {
    const result = brazilianPhoneSchema.safeParse('(85) 99202-9844');
    expect(result.success).toBe(true);
    expect(result.success && result.data).toBe('5585992029844');
  });

  it('rejeita telefone inválido com mensagem em português', () => {
    const result = brazilianPhoneSchema.safeParse('123');
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0]?.message).toContain('telefone');
  });
});
