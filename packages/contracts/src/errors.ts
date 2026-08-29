import { z } from 'zod';

/**
 * Códigos de erro estáveis. O frontend reage ao código, nunca à mensagem,
 * e a API nunca devolve stack trace nem revela a existência de recursos alheios.
 */
export const apiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'SCHEDULE_CONFLICT',
  'DUPLICATE_RESOURCE',
  'RATE_LIMITED',
  'CSRF_INVALID',
  'INVALID_CREDENTIALS',
  'INVALID_TOKEN',
  'PAYMENT_EXCEEDS_TOTAL',
  'INTERNAL_ERROR',
]);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const fieldErrorSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    requestId: z.string().optional(),
    fields: z.array(fieldErrorSchema).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/** Mensagens padrão em pt-BR, sem vazar detalhes técnicos. */
export const API_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  VALIDATION_ERROR: 'Verifique os dados informados.',
  UNAUTHENTICATED: 'Faça login para continuar.',
  FORBIDDEN: 'Você não tem permissão para esta ação.',
  NOT_FOUND: 'Registro não encontrado.',
  CONFLICT: 'A operação conflita com o estado atual do registro.',
  SCHEDULE_CONFLICT: 'Já existe um atendimento neste horário.',
  DUPLICATE_RESOURCE: 'Este registro já existe.',
  RATE_LIMITED: 'Muitas tentativas. Aguarde alguns instantes.',
  CSRF_INVALID: 'Sessão expirada. Recarregue a página e tente novamente.',
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  INVALID_TOKEN: 'Este link é inválido ou expirou.',
  PAYMENT_EXCEEDS_TOTAL: 'O pagamento excede o valor devido.',
  INTERNAL_ERROR: 'Não foi possível concluir a operação. Tente novamente.',
};
