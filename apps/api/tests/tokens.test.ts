import { describe, expect, it } from 'vitest';
import { generateToken, hashToken, safeCompareHashes } from '../src/lib/tokens.js';

describe('generateToken', () => {
  it('gera tokens únicos', () => {
    const tokens = new Set(Array.from({ length: 500 }, () => generateToken()));
    expect(tokens.size).toBe(500);
  });

  it('usa base64url, seguro em cookie e em URL', () => {
    for (let index = 0; index < 50; index += 1) {
      // Sem +, / ou =, que precisariam de escape ao viajar num link de convite.
      expect(generateToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('tem entropia suficiente contra tentativa e erro', () => {
    // 32 bytes em base64url resultam em 43 caracteres.
    expect(generateToken()).toHaveLength(43);
  });
});

describe('hashToken', () => {
  it('produz um hash SHA-256 em hexadecimal', () => {
    expect(hashToken('token-de-teste')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('é determinístico, permitindo buscar a sessão pelo hash', () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('nunca contém o token original', () => {
    const token = generateToken();
    expect(hashToken(token)).not.toContain(token);
  });

  it('muda completamente com um caractere diferente', () => {
    const a = hashToken('token-de-teste');
    const b = hashToken('token-de-testf');
    expect(a).not.toBe(b);

    // Efeito avalanche: mais da metade dos caracteres deve diferir.
    const equalChars = [...a].filter((char, index) => char === b[index]).length;
    expect(equalChars).toBeLessThan(a.length / 2);
  });
});

describe('safeCompareHashes', () => {
  it('reconhece hashes iguais', () => {
    const hash = hashToken('token-de-teste');
    expect(safeCompareHashes(hash, hash)).toBe(true);
  });

  it('rejeita hashes diferentes', () => {
    expect(safeCompareHashes(hashToken('a'), hashToken('b'))).toBe(false);
  });

  it('rejeita tamanhos diferentes sem lançar', () => {
    // timingSafeEqual lança quando os tamanhos divergem; a função precisa
    // absorver isso e simplesmente responder que não são iguais.
    expect(safeCompareHashes('curto', hashToken('token'))).toBe(false);
    expect(safeCompareHashes('', hashToken('token'))).toBe(false);
  });

  it('rejeita quando difere apenas no último caractere', () => {
    const hash = hashToken('token-de-teste');
    const almost = `${hash.slice(0, -1)}${hash.endsWith('a') ? 'b' : 'a'}`;
    expect(safeCompareHashes(hash, almost)).toBe(false);
  });
});
