import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * 32 bytes aleatórios em base64url: 256 bits de entropia, impossível de acertar
 * por tentativa. Fica com 43 caracteres, cabendo em cookie e em URL sem escape.
 */
const TOKEN_BYTES = 32;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Hash do token para guardar no banco.
 *
 * Tokens de sessão, convite e redefinição de senha são credenciais: se fossem
 * guardados em texto, um vazamento do banco permitiria assumir sessões e
 * redefinir senhas. SHA-256 sem sal basta aqui, diferente de senhas, porque o
 * token já tem 256 bits de aleatoriedade e não é adivinhável por dicionário.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Compara dois hashes em tempo constante.
 *
 * A comparação comum de strings retorna no primeiro caractere diferente, o que
 * permitiria descobrir um token válido caractere a caractere medindo o tempo.
 */
export function safeCompareHashes(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  // timingSafeEqual exige o mesmo tamanho; tamanhos diferentes já são desiguais.
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
