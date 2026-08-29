import { API_ERROR_MESSAGES, type ApiErrorCode } from '@studio-charme/contracts';

type FieldError = { path: string; message: string };

/**
 * Erro de domínio com código estável e status HTTP.
 * O handler central converte isto na resposta padronizada da API; nada além
 * da mensagem mapeada chega ao cliente.
 */
export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly fields?: FieldError[];
  /** Detalhe registrado apenas no log, nunca devolvido na resposta. */
  readonly logDetail?: string;

  constructor(
    code: ApiErrorCode,
    statusCode: number,
    options: { message?: string; fields?: FieldError[]; logDetail?: string } = {},
  ) {
    super(options.message ?? API_ERROR_MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.fields = options.fields;
    this.logDetail = options.logDetail;
  }
}

export const unauthenticated = (logDetail?: string) =>
  new AppError('UNAUTHENTICATED', 401, { logDetail });

export const forbidden = (logDetail?: string) => new AppError('FORBIDDEN', 403, { logDetail });

/**
 * Usado tanto para recursos inexistentes quanto para recursos de outra
 * profissional: a resposta é idêntica, de modo que ninguém consiga inferir
 * a existência de um registro alheio trocando IDs.
 */
export const notFound = (logDetail?: string) => new AppError('NOT_FOUND', 404, { logDetail });

export const conflict = (message?: string, logDetail?: string) =>
  new AppError('CONFLICT', 409, { message, logDetail });

export const scheduleConflict = (message?: string) =>
  new AppError('SCHEDULE_CONFLICT', 409, { message });

export const duplicateResource = (message?: string, fields?: FieldError[]) =>
  new AppError('DUPLICATE_RESOURCE', 409, { message, fields });

export const validationError = (fields: FieldError[], message?: string) =>
  new AppError('VALIDATION_ERROR', 422, { fields, message });

export const invalidCredentials = (logDetail?: string) =>
  new AppError('INVALID_CREDENTIALS', 401, { logDetail });

export const invalidToken = (logDetail?: string) =>
  new AppError('INVALID_TOKEN', 400, { logDetail });
