import { describe, expect, it } from 'vitest';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@studio-charme/contracts';
import {
  hashPassword,
  needsRehash,
  simulatePasswordVerification,
  verifyPassword,
} from '../src/lib/password.js';

describe('hashPassword', () => {
  it('gera um hash Argon2id', async () => {
    const hash = await hashPassword('senha-bem-comprida');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('nunca guarda a senha em texto', async () => {
    const password = 'minha-senha-secreta';
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
  });

  it('gera hashes diferentes para a mesma senha', async () => {
    // Sal aleatório: duas contas com a mesma senha não podem ter o mesmo hash,
    // senão quebrar uma revelaria a outra.
    const [first, second] = await Promise.all([
      hashPassword('senha-identica-aqui'),
      hashPassword('senha-identica-aqui'),
    ]);
    expect(first).not.toBe(second);
  });

  it('embute os parâmetros de custo no hash', async () => {
    const hash = await hashPassword('senha-bem-comprida');
    expect(hash).toContain('m=19456');
    expect(hash).toContain('t=2');
    expect(hash).toContain('p=1');
  });
});

describe('verifyPassword', () => {
  it('aceita a senha correta', async () => {
    const hash = await hashPassword('senha-bem-comprida');
    await expect(verifyPassword(hash, 'senha-bem-comprida')).resolves.toBe(true);
  });

  it('rejeita a senha errada', async () => {
    const hash = await hashPassword('senha-bem-comprida');
    await expect(verifyPassword(hash, 'senha-bem-compridA')).resolves.toBe(false);
  });

  it('diferencia maiúsculas de minúsculas', async () => {
    const hash = await hashPassword('SenhaComMaiuscula');
    await expect(verifyPassword(hash, 'senhacommaiuscula')).resolves.toBe(false);
  });

  it('devolve false em vez de lançar quando o hash é inválido', async () => {
    // Um hash corrompido não pode virar erro 500: isso confirmaria a existência
    // da conta e derrubaria o login em vez de apenas recusá-lo.
    await expect(verifyPassword('nao-e-um-hash', 'qualquer-senha')).resolves.toBe(false);
    await expect(verifyPassword('', 'qualquer-senha')).resolves.toBe(false);
    await expect(verifyPassword('$argon2id$quebrado', 'qualquer-senha')).resolves.toBe(false);
  });

  it('trata senhas com acento e emoji', async () => {
    const password = 'coração-ção-🔒-senha';
    const hash = await hashPassword(password);
    await expect(verifyPassword(hash, password)).resolves.toBe(true);
  });

  it('aceita senha no tamanho máximo permitido', async () => {
    const password = 'a'.repeat(MAX_PASSWORD_LENGTH);
    const hash = await hashPassword(password);
    await expect(verifyPassword(hash, password)).resolves.toBe(true);
  });
});

describe('simulatePasswordVerification', () => {
  it('não lança e gasta tempo comparável a uma verificação real', async () => {
    const hash = await hashPassword('senha-bem-comprida');

    const startReal = performance.now();
    await verifyPassword(hash, 'senha-errada-aqui');
    const realDuration = performance.now() - startReal;

    const startFake = performance.now();
    await simulatePasswordVerification();
    const fakeDuration = performance.now() - startFake;

    // A simulação existe para não vazar, pelo tempo de resposta, se o e-mail
    // existe. Uma diferença de ordem de magnitude anularia essa proteção.
    expect(fakeDuration).toBeGreaterThan(realDuration / 10);
    expect(fakeDuration).toBeLessThan(realDuration * 10);
  });
});

describe('needsRehash', () => {
  it('não pede novo hash para os parâmetros atuais', async () => {
    const hash = await hashPassword('senha-bem-comprida');
    expect(needsRehash(hash)).toBe(false);
  });

  it('pede novo hash quando os parâmetros são mais fracos', () => {
    // Hash com custo de memória menor que o exigido hoje.
    const weakHash =
      '$argon2id$v=19$m=4096,t=2,p=1$c29tZXNhbHRoZXJlMTIz$Zm9vYmFyYmF6cXV1eGNvcmdlZ3JhdWx0';
    expect(needsRehash(weakHash)).toBe(true);
  });
});

describe('limites de senha', () => {
  it('exige tamanho mínimo alinhado à recomendação da OWASP', () => {
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(8);
  });

  it('limita o tamanho para não processar corpo enorme como senha', () => {
    expect(MAX_PASSWORD_LENGTH).toBeLessThanOrEqual(1024);
  });
});
