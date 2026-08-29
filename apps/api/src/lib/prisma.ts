import { PrismaClient } from '@prisma/client';
import type { Env } from '../config/env.js';

/**
 * Cliente do Prisma.
 *
 * Em desenvolvimento o `tsx watch` reinicia o módulo a cada alteração; sem
 * reaproveitar a instância, cada reinício abriria um novo pool de conexões até
 * o banco recusar novas ligações. A instância fica no escopo global apenas no
 * desenvolvimento, onde esse recarregamento acontece.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function createPrismaClient(env: Env): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const client = new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
    // Consultas só são registradas em desenvolvimento: em produção elas
    // encheriam o log e poderiam expor dados das clientes nos parâmetros.
    log:
      env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
        : ['warn', 'error'],
  });

  if (env.NODE_ENV === 'development') {
    globalForPrisma.prisma = client;
  }

  return client;
}

/** Erros do Prisma que a aplicação trata de forma específica. */
export const PRISMA_ERROR = {
  /** Violação de restrição de unicidade. */
  UNIQUE_VIOLATION: 'P2002',
  /** Registro não encontrado na operação. */
  NOT_FOUND: 'P2025',
  /** Violação de chave estrangeira. */
  FOREIGN_KEY_VIOLATION: 'P2003',
} as const;

type PrismaKnownError = { code: string; meta?: Record<string, unknown> };

export function isPrismaError(error: unknown, code: string): error is PrismaKnownError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === code
  );
}

/**
 * Identifica a violação da restrição de exclusão que impede horário duplo.
 *
 * A restrição é declarada em SQL (o Prisma não a expressa), então o erro chega
 * como falha bruta do Postgres, com o código 23P01 e o nome da restrição.
 */
export function isAppointmentOverlapError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const message = 'message' in error ? String((error as { message: unknown }).message) : '';
  return message.includes('appointments_no_overlap') || message.includes('23P01');
}
