import type { Prisma, PrismaClient } from '@prisma/client';
import type { FastifyRequest } from 'fastify';

/**
 * Ações registradas na auditoria.
 *
 * Lista fechada para o log ser pesquisável: nomes livres viram grafias
 * divergentes e tornam impossível responder "quem cancelou este atendimento?".
 */
export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILED: 'auth.login.failed',
  LOGOUT: 'auth.logout',
  PASSWORD_RESET_REQUESTED: 'auth.password.reset_requested',
  PASSWORD_RESET_COMPLETED: 'auth.password.reset_completed',
  PASSWORD_CHANGED: 'auth.password.changed',
  INVITE_ACCEPTED: 'auth.invite.accepted',
  SESSION_REVOKED: 'auth.session.revoked',

  CLIENT_CREATED: 'client.created',
  CLIENT_UPDATED: 'client.updated',
  CLIENT_DELETED: 'client.deleted',

  SERVICE_CREATED: 'service.created',
  SERVICE_UPDATED: 'service.updated',
  SERVICE_DELETED: 'service.deleted',

  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_UPDATED: 'appointment.updated',
  APPOINTMENT_STATUS_CHANGED: 'appointment.status_changed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',

  PAYMENT_CREATED: 'payment.created',
  PAYMENT_UPDATED: 'payment.updated',
  PAYMENT_DELETED: 'payment.deleted',

  EXPENSE_CREATED: 'expense.created',
  EXPENSE_UPDATED: 'expense.updated',
  EXPENSE_DELETED: 'expense.deleted',

  /** Tentativa de acessar dado de outra profissional. */
  ACCESS_DENIED: 'security.access_denied',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Campos que nunca entram no metadata da auditoria.
 *
 * O log é lido por pessoas e pode ser exportado; senha, token e hash não podem
 * vazar por ele. A remoção é feita aqui, e não em cada chamada, para não
 * depender de quem escreve o código lembrar da regra.
 */
const REDACTED_KEYS = new Set([
  'password',
  'passwordconfirmation',
  'currentpassword',
  'passwordhash',
  'token',
  'tokenhash',
  'secret',
  'authorization',
  'cookie',
]);

function sanitizeMetadata(value: unknown, depth = 0): unknown {
  // Limita a profundidade para um objeto cíclico ou gigante não travar o log.
  if (depth > 4) return '[profundo]';

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeMetadata(item, depth + 1));
  }

  if (typeof value === 'object' && value !== null) {
    if (value instanceof Date) return value.toISOString();

    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = REDACTED_KEYS.has(key.toLowerCase())
        ? '[redigido]'
        : sanitizeMetadata(entry, depth + 1);
    }
    return result;
  }

  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 500)}…`;
  }

  return value;
}

export type AuditEntry = {
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  professionalId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Grava um evento de auditoria.
 *
 * Falha aqui nunca interrompe a operação principal: se o log não puder ser
 * gravado, a profissional não pode perder o agendamento que acabou de salvar.
 * O erro vai para o log da aplicação para ser investigado.
 */
export async function recordAudit(
  prisma: PrismaClient,
  request: FastifyRequest,
  entry: AuditEntry,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        professionalId: entry.professionalId ?? request.professional?.id ?? null,
        metadata: entry.metadata
          ? (JSON.parse(JSON.stringify(sanitizeMetadata(entry.metadata))) as Prisma.InputJsonValue)
          : undefined,
        ipAddress: request.ip,
        // O user agent completo pode ser enorme; o essencial cabe em 300.
        userAgent: request.headers['user-agent']?.slice(0, 300) ?? null,
      },
    });
  } catch (error) {
    request.log.error({ err: error, action: entry.action }, 'falha ao gravar auditoria');
  }
}
