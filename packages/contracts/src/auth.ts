import { z } from 'zod';

/**
 * Comprimento mínimo da senha.
 *
 * A recomendação atual da OWASP é priorizar tamanho em vez de exigir mistura de
 * maiúsculas, números e símbolos: essas regras empurram as pessoas para padrões
 * previsíveis como "Senha@123", que são fáceis para um ataque de dicionário e
 * difíceis de lembrar.
 */
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

export const emailSchema = z
  .string()
  .trim()
  // Guardado e comparado em minúsculas: quem cadastra "Livia@..." precisa
  // conseguir entrar digitando "livia@...".
  .toLowerCase()
  .pipe(z.email('Informe um e-mail válido.'))
  .pipe(z.string().max(180, 'O e-mail é muito longo.'));

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `A senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`)
  .max(MAX_PASSWORD_LENGTH, 'A senha é muito longa.')
  // Espaço em branco nas pontas normalmente é erro de digitação ou de colagem,
  // e geraria um "senha incorreta" impossível de entender.
  .refine((value) => value.trim() === value, 'A senha não pode começar nem terminar com espaço.');

export const loginSchema = z.object({
  email: emailSchema,
  // Na entrada não se aplicam as regras de força: quem tem senha antiga mais
  // curta ainda precisa conseguir entrar para poder trocá-la.
  password: z.string().min(1, 'Informe sua senha.').max(MAX_PASSWORD_LENGTH),
  /**
   * Mantém a sessão além do fechamento do navegador. Quando falso, o cookie é
   * de sessão e some ao fechar — mais adequado a um computador compartilhado.
   */
  rememberMe: z.boolean().default(false),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

const passwordConfirmation = z
  .object({
    token: z.string().min(1, 'Link inválido.').max(200),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'As senhas não conferem.',
  });

export const resetPasswordSchema = passwordConfirmation;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Primeiro acesso por convite: mesma forma da redefinição. */
export const acceptInviteSchema = passwordConfirmation;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe sua senha atual.').max(MAX_PASSWORD_LENGTH),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'As senhas não conferem.',
  })
  .refine((data) => data.password !== data.currentPassword, {
    path: ['password'],
    message: 'A nova senha precisa ser diferente da atual.',
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Dados da profissional autenticada.
 *
 * Não inclui hash de senha nem qualquer campo sensível: é exatamente o que a
 * interface precisa saber sobre quem está logada.
 */
export const authenticatedProfessionalSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  photoUrl: z.string().nullable(),
});
export type AuthenticatedProfessional = z.infer<typeof authenticatedProfessionalSchema>;

export const sessionResponseSchema = z.object({
  professional: authenticatedProfessionalSchema,
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
