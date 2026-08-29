import type { FastifyRequest } from 'fastify';
import { AppError } from './errors.js';

/**
 * Isolamento de dados entre profissionais.
 *
 * Toda consulta a dado privado passa por aqui. A função existe para que o
 * `professionalId` nunca venha do corpo ou da URL da requisição: ele vem sempre
 * da sessão. Do contrário, bastaria alterar um campo enviado para ler a agenda,
 * as clientes ou o faturamento de outra profissional.
 */
export function getScopedProfessionalId(request: FastifyRequest): string {
  const professional = request.professional;

  if (!professional) {
    // Chegar aqui significa rota privada registrada sem `requireAuth`: é um erro
    // de programação, e falhar alto é melhor que devolver dados sem escopo.
    throw new AppError('UNAUTHENTICATED', 401, {
      logDetail: 'rota privada acessada sem requireAuth',
    });
  }

  return professional.id;
}

/**
 * Confirma que o registro encontrado pertence a quem está autenticada.
 *
 * Responde 404, e não 403: um 403 confirmaria que aquele identificador existe e
 * pertence a outra pessoa. Para quem consulta, "não é seu" e "não existe" são
 * indistinguíveis.
 */
export function assertOwnership(
  record: { professionalId: string } | null,
  request: FastifyRequest,
  entityLabel: string,
): asserts record is { professionalId: string } {
  const professionalId = getScopedProfessionalId(request);

  if (!record || record.professionalId !== professionalId) {
    throw new AppError('NOT_FOUND', 404, { message: `${entityLabel} não encontrado.` });
  }
}

/**
 * Cláusula `where` com o escopo da profissional autenticada.
 *
 * Usada nas consultas de listagem para que o filtro por profissional não
 * dependa de alguém lembrar de escrevê-lo.
 */
export function scopedWhere<T extends Record<string, unknown>>(
  request: FastifyRequest,
  where: T = {} as T,
): T & { professionalId: string } {
  return { ...where, professionalId: getScopedProfessionalId(request) };
}
