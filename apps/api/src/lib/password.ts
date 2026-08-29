import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';

/**
 * Parâmetros do Argon2id.
 *
 * Seguem a recomendação da OWASP para Argon2id: 19 MiB de memória, 2 iterações e
 * paralelismo 1. O custo de memória é o que encarece o ataque em GPU, por isso
 * ele não deve ser reduzido para "ganhar velocidade" no login.
 *
 * O Argon2 embute os parâmetros no próprio hash, então senhas criadas com
 * valores antigos continuam validando depois de um ajuste aqui.
 */
const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, HASH_OPTIONS);
}

/**
 * Confere a senha contra o hash guardado.
 *
 * Nunca lança: um hash corrompido ou em formato desconhecido resulta em `false`,
 * porque uma exceção aqui viraria erro 500 e revelaria que aquele e-mail existe.
 */
export async function verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainPassword);
  } catch {
    return false;
  }
}

/**
 * Hash descartável usado na verificação simulada.
 *
 * Calculado sob demanda a partir de um valor aleatório e mantido em memória.
 * Deixá-lo fixo no código exigiria colar um hash literal aqui, que poderia
 * envelhecer em relação aos parâmetros acima e ainda pareceria uma credencial
 * para quem lesse o arquivo. Nenhuma conta usa este hash.
 */
let dummyHashPromise: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash(randomBytes(32).toString('hex'), HASH_OPTIONS);
  return dummyHashPromise;
}

/**
 * Executa o mesmo trabalho de uma verificação real contra um hash descartável.
 *
 * Chamado quando o e-mail não existe ou a conta ainda não tem senha definida.
 * Sem isso, a resposta para um e-mail inexistente voltaria em poucos
 * milissegundos e a de um e-mail válido levaria bem mais, permitindo descobrir
 * quais contas existem apenas medindo o tempo de resposta.
 */
export async function simulatePasswordVerification(): Promise<void> {
  try {
    await argon2.verify(await getDummyHash(), 'senha-que-nunca-confere');
  } catch {
    // Nunca confere, por construção. O que importa é o tempo gasto.
  }
}

/** Indica que o hash foi criado com parâmetros mais fracos que os atuais. */
export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, HASH_OPTIONS);
}
