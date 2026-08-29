import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { API_ERROR_MESSAGES, type ApiErrorCode } from '@studio-charme/contracts';
import { AppError } from '../lib/errors.js';

type ErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
    fields?: { path: string; message: string }[];
  };
};

function buildBody(
  code: ApiErrorCode,
  requestId: string,
  message?: string,
  fields?: { path: string; message: string }[],
): ErrorBody {
  return {
    error: {
      code,
      message: message ?? API_ERROR_MESSAGES[code],
      requestId,
      ...(fields && fields.length > 0 ? { fields } : {}),
    },
  };
}

/**
 * Tratamento centralizado de erros.
 *
 * Toda resposta de erro tem o mesmo formato e nenhuma expõe stack trace, SQL,
 * nome de tabela ou a existência de registros de outra profissional. O detalhe
 * técnico fica somente no log, correlacionado pelo requestId.
 */
export const errorHandlerPlugin = fp(async (app) => {
  app.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send(buildBody('NOT_FOUND', request.id, 'Rota não encontrada.'));
  });

  app.setErrorHandler(async (error: unknown, request, reply) => {
    if (error instanceof AppError) {
      // 4xx esperado é comportamento normal: registra em nível baixo, sem stack.
      request.log.info(
        { code: error.code, statusCode: error.statusCode, detail: error.logDetail },
        'requisição rejeitada',
      );
      return reply
        .status(error.statusCode)
        .send(buildBody(error.code, request.id, error.message, error.fields));
    }

    if (error instanceof ZodError) {
      const fields = error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      request.log.info({ fields }, 'validação de entrada falhou');
      return reply.status(422).send(buildBody('VALIDATION_ERROR', request.id, undefined, fields));
    }

    // Erros gerados pelo próprio Fastify (payload inválido, rate limit, parsing)
    // carregam statusCode, mas não são instâncias das nossas classes de domínio.
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? (error as { statusCode?: unknown }).statusCode
        : undefined;

    if (statusCode === 429) {
      return reply.status(429).send(buildBody('RATE_LIMITED', request.id));
    }

    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      request.log.info({ err: error }, 'requisição malformada');
      return reply.status(statusCode).send(buildBody('VALIDATION_ERROR', request.id));
    }

    request.log.error({ err: error }, 'erro não tratado');
    return reply.status(500).send(buildBody('INTERNAL_ERROR', request.id));
  });
});
