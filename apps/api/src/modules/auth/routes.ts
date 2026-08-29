import type { FastifyRequest } from 'fastify';
import {
  acceptInviteSchema,
  authenticatedProfessionalSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from '@studio-charme/contracts';
import { z } from 'zod';
import { AppError } from '../../lib/errors.js';
import { AUDIT_ACTIONS, recordAudit } from '../../lib/audit.js';
import {
  hashPassword,
  needsRehash,
  simulatePasswordVerification,
  verifyPassword,
} from '../../lib/password.js';
import { generateToken, hashToken } from '../../lib/tokens.js';
import { buildInviteEmail, buildPasswordResetEmail, createMailer } from '../../lib/mailer.js';
import { getScopedProfessionalId } from '../../lib/scope.js';
import type { AppInstance } from '../../types/app.js';

/** Prazo do link de redefinição: curto, porque chega por e-mail. */
const PASSWORD_RESET_TTL_MINUTES = 30;

/** Prazo do convite: longo, porque é o primeiro acesso e pode não ser imediato. */
const INVITE_TTL_HOURS = 72;

/**
 * Resposta única do pedido de recuperação de senha.
 *
 * Sempre a mesma, exista ou não a conta. Responder "e-mail não encontrado"
 * transformaria a tela em um verificador de contas: qualquer pessoa poderia
 * descobrir quais endereços têm acesso ao sistema.
 */
const GENERIC_RESET_MESSAGE =
  'Se este e-mail estiver cadastrado, enviamos as instruções para redefinir a senha.';

export async function authRoutes(app: AppInstance): Promise<void> {
  const mailer = createMailer(app.env, app.log);

  /**
   * Limite específico das rotas de autenticação.
   *
   * Bem mais restrito que o global: sem isso, um ataque poderia testar milhares
   * de senhas. O Argon2id já encarece cada tentativa, mas o limite é o que
   * impede o volume.
   */
  const authRateLimit = {
    max: 8,
    timeWindow: '5 minutes',
    // A chave inclui o e-mail para que uma pessoa atrás do mesmo IP (rede
    // compartilhada) não seja bloqueada pela tentativa de outra.
    keyGenerator: (request: { ip: string; body?: unknown }) => {
      const email =
        typeof request.body === 'object' && request.body !== null && 'email' in request.body
          ? String((request.body as { email: unknown }).email).toLowerCase()
          : '';
      return `${request.ip}:${email}`;
    },
  };

  // -------------------------------------------------------------------------
  // Entrar
  // -------------------------------------------------------------------------
  app.post(
    '/auth/login',
    {
      config: { rateLimit: authRateLimit },
      schema: {
        body: loginSchema,
        response: {
          200: z.object({
            professional: authenticatedProfessionalSchema,
            csrfToken: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { email, password, rememberMe } = request.body;

      const professional = await app.prisma.professional.findUnique({
        where: { email },
        select: {
          id: true,
          slug: true,
          name: true,
          email: true,
          role: true,
          photoUrl: true,
          passwordHash: true,
          isActive: true,
        },
      });

      /**
       * Conta inexistente, sem senha definida ou desativada seguem o mesmo
       * caminho: gastam o tempo de uma verificação real e devolvem a mesma
       * mensagem. Sem isso, o tempo de resposta e o texto do erro revelariam
       * quais e-mails existem.
       */
      if (!professional?.passwordHash || !professional.isActive) {
        await simulatePasswordVerification();
        await recordAudit(app.prisma, request, {
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          entity: 'professional',
          professionalId: professional?.id ?? null,
          metadata: { email, reason: !professional ? 'inexistente' : 'sem_senha_ou_inativa' },
        });
        throw new AppError('INVALID_CREDENTIALS', 401);
      }

      const passwordMatches = await verifyPassword(professional.passwordHash, password);

      if (!passwordMatches) {
        await recordAudit(app.prisma, request, {
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          entity: 'professional',
          entityId: professional.id,
          professionalId: professional.id,
          metadata: { email, reason: 'senha_incorreta' },
        });
        throw new AppError('INVALID_CREDENTIALS', 401);
      }

      // Aproveita o momento em que a senha em texto está disponível para
      // atualizar o hash, caso os parâmetros de custo tenham sido reforçados.
      if (needsRehash(professional.passwordHash)) {
        await app.prisma.professional.update({
          where: { id: professional.id },
          data: { passwordHash: await hashPassword(password) },
        });
      }

      const csrfToken = await app.sessions.create(reply, professional.id, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        rememberMe,
      });

      await app.prisma.professional.update({
        where: { id: professional.id },
        data: { lastLoginAt: new Date() },
      });

      await recordAudit(app.prisma, request, {
        action: AUDIT_ACTIONS.LOGIN_SUCCESS,
        entity: 'professional',
        entityId: professional.id,
        professionalId: professional.id,
      });

      const { passwordHash: _hash, isActive: _active, ...safe } = professional;
      return { professional: safe, csrfToken };
    },
  );

  // -------------------------------------------------------------------------
  // Sair
  // -------------------------------------------------------------------------
  app.post(
    '/auth/logout',
    { schema: { response: { 204: z.null() } } },
    async (request, reply) => {
      // Não exige sessão válida: sair com cookie já expirado precisa limpar o
      // cookie do navegador e responder com sucesso, não com erro.
      await app.optionalAuth(request);

      if (request.professional) {
        await recordAudit(app.prisma, request, {
          action: AUDIT_ACTIONS.LOGOUT,
          entity: 'professional',
          entityId: request.professional.id,
        });
      }

      await app.sessions.destroy(request, reply);
      return reply.status(204).send(null);
    },
  );

  // -------------------------------------------------------------------------
  // Sessão atual
  // -------------------------------------------------------------------------
  app.get(
    '/auth/me',
    {
      preHandler: app.requireAuth,
      schema: { response: { 200: z.object({ professional: authenticatedProfessionalSchema }) } },
    },
    async (request) => ({ professional: request.professional! }),
  );

  app.get(
    '/auth/csrf',
    { schema: { response: { 200: z.object({ csrfToken: z.string() }) } } },
    async (_request, reply) => ({ csrfToken: app.sessions.issueCsrfToken(reply) }),
  );

  // -------------------------------------------------------------------------
  // Esqueci a senha
  // -------------------------------------------------------------------------
  app.post(
    '/auth/forgot-password',
    {
      config: { rateLimit: authRateLimit },
      schema: {
        body: forgotPasswordSchema,
        response: { 200: z.object({ message: z.string() }) },
      },
    },
    async (request) => {
      const { email } = request.body;

      const professional = await app.prisma.professional.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, isActive: true },
      });

      if (professional?.isActive) {
        const token = generateToken();

        await app.prisma.$transaction(async (tx) => {
          // Invalida pedidos anteriores: só o link mais recente vale, para um
          // e-mail antigo esquecido na caixa não continuar servindo.
          await tx.accessToken.updateMany({
            where: { professionalId: professional.id, purpose: 'PASSWORD_RESET', usedAt: null },
            data: { usedAt: new Date() },
          });

          await tx.accessToken.create({
            data: {
              tokenHash: hashToken(token),
              purpose: 'PASSWORD_RESET',
              professionalId: professional.id,
              expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000),
            },
          });
        });

        const link = `${app.env.WEB_PUBLIC_URL}/definir-senha?token=${token}`;
        const message = buildPasswordResetEmail({
          name: professional.name,
          link,
          expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
        });

        await mailer.send({ ...message, to: professional.email });

        await recordAudit(app.prisma, request, {
          action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
          entity: 'professional',
          entityId: professional.id,
          professionalId: professional.id,
        });
      }

      // Mesma resposta em todos os casos, inclusive quando nada foi enviado.
      return { message: GENERIC_RESET_MESSAGE };
    },
  );

  // -------------------------------------------------------------------------
  // Definir senha por token (redefinição e primeiro acesso)
  // -------------------------------------------------------------------------
  const consumeTokenAndSetPassword = async (
    request: FastifyRequest,
    purpose: 'PASSWORD_RESET' | 'INVITE',
    token: string,
    password: string,
  ): Promise<void> => {
    const record = await app.prisma.accessToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: {
        id: true,
        purpose: true,
        expiresAt: true,
        usedAt: true,
        professional: { select: { id: true, isActive: true } },
      },
    });

    const isUsable =
      record !== null &&
      record.purpose === purpose &&
      record.usedAt === null &&
      record.expiresAt.getTime() > Date.now() &&
      record.professional.isActive;

    if (!isUsable) {
      // Uma única mensagem para token inexistente, de outro tipo, já usado ou
      // expirado: detalhar ajudaria a sondar tokens válidos.
      throw new AppError('INVALID_TOKEN', 400, {
        message: 'Este link é inválido ou expirou. Solicite um novo.',
      });
    }

    const passwordHash = await hashPassword(password);

    await app.prisma.$transaction(async (tx) => {
      /**
       * `updateMany` com `usedAt: null` no filtro faz o consumo do token ser
       * atômico: se duas requisições chegarem juntas com o mesmo link, apenas
       * uma encontra o registro ainda não usado.
       */
      const consumed = await tx.accessToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      if (consumed.count === 0) {
        throw new AppError('INVALID_TOKEN', 400, { message: 'Este link já foi utilizado.' });
      }

      await tx.professional.update({
        where: { id: record.professional.id },
        data: { passwordHash },
      });

      // Qualquer outro link pendente perde validade junto.
      await tx.accessToken.updateMany({
        where: { professionalId: record.professional.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Encerra todas as sessões: se a senha foi trocada por suspeita de acesso
      // indevido, quem estava dentro precisa cair.
      await tx.session.updateMany({
        where: { professionalId: record.professional.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await recordAudit(app.prisma, request, {
      action:
        purpose === 'INVITE'
          ? AUDIT_ACTIONS.INVITE_ACCEPTED
          : AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      entity: 'professional',
      entityId: record.professional.id,
      professionalId: record.professional.id,
    });
  };

  app.post(
    '/auth/reset-password',
    {
      config: { rateLimit: authRateLimit },
      schema: {
        body: resetPasswordSchema,
        response: { 200: z.object({ message: z.string() }) },
      },
    },
    async (request) => {
      const { token, password } = request.body;
      await consumeTokenAndSetPassword(request, 'PASSWORD_RESET', token, password);
      return { message: 'Senha redefinida. Você já pode entrar com a nova senha.' };
    },
  );

  app.post(
    '/auth/accept-invite',
    {
      config: { rateLimit: authRateLimit },
      schema: {
        body: acceptInviteSchema,
        response: { 200: z.object({ message: z.string() }) },
      },
    },
    async (request) => {
      const { token, password } = request.body;
      await consumeTokenAndSetPassword(request, 'INVITE', token, password);
      return { message: 'Senha criada. Você já pode entrar no sistema.' };
    },
  );

  // -------------------------------------------------------------------------
  // Trocar a própria senha, já autenticada
  // -------------------------------------------------------------------------
  app.post(
    '/auth/change-password',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: {
        body: changePasswordSchema,
        response: { 200: z.object({ message: z.string(), revokedSessions: z.number() }) },
      },
    },
    async (request) => {
      const professionalId = getScopedProfessionalId(request);
      const { currentPassword, password } = request.body;

      const professional = await app.prisma.professional.findUnique({
        where: { id: professionalId },
        select: { passwordHash: true },
      });

      // Exigir a senha atual impede que alguém com a sessão aberta numa máquina
      // esquecida assuma a conta trocando a senha.
      if (
        !professional?.passwordHash ||
        !(await verifyPassword(professional.passwordHash, currentPassword))
      ) {
        throw new AppError('INVALID_CREDENTIALS', 401, {
          message: 'A senha atual está incorreta.',
        });
      }

      await app.prisma.professional.update({
        where: { id: professionalId },
        data: { passwordHash: await hashPassword(password) },
      });

      // Mantém a sessão de quem está trocando e derruba as demais.
      const revokedSessions = await app.sessions.revokeAllForProfessional(
        professionalId,
        request.sessionId ?? undefined,
      );

      await recordAudit(app.prisma, request, {
        action: AUDIT_ACTIONS.PASSWORD_CHANGED,
        entity: 'professional',
        entityId: professionalId,
        metadata: { revokedSessions },
      });

      return {
        message: 'Senha alterada. Os outros dispositivos foram desconectados.',
        revokedSessions,
      };
    },
  );

  // -------------------------------------------------------------------------
  // Convite de primeiro acesso
  // -------------------------------------------------------------------------
  app.post(
    '/auth/invite',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
      schema: {
        body: z.object({ professionalId: z.uuid() }),
        response: { 200: z.object({ message: z.string() }) },
      },
    },
    async (request) => {
      /**
       * Cada profissional só pode gerar convite para a própria conta.
       *
       * O convite define senha sem conhecer a anterior; permitir gerá-lo para
       * outra pessoa seria entregar a conta dela. O primeiro acesso das contas
       * criadas pelo seed é feito pelo fluxo de recuperação de senha.
       */
      const professionalId = getScopedProfessionalId(request);

      if (request.body.professionalId !== professionalId) {
        await recordAudit(app.prisma, request, {
          action: AUDIT_ACTIONS.ACCESS_DENIED,
          entity: 'professional',
          entityId: request.body.professionalId,
          metadata: { attemptedAction: 'invite' },
        });
        throw new AppError('NOT_FOUND', 404, { message: 'Profissional não encontrada.' });
      }

      const professional = await app.prisma.professional.findUnique({
        where: { id: professionalId },
        select: { id: true, name: true, email: true },
      });

      if (!professional) {
        throw new AppError('NOT_FOUND', 404, { message: 'Profissional não encontrada.' });
      }

      const token = generateToken();

      await app.prisma.accessToken.create({
        data: {
          tokenHash: hashToken(token),
          purpose: 'INVITE',
          professionalId: professional.id,
          expiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000),
        },
      });

      const link = `${app.env.WEB_PUBLIC_URL}/definir-senha?token=${token}&convite=1`;
      const message = buildInviteEmail({
        name: professional.name,
        link,
        expiresInHours: INVITE_TTL_HOURS,
      });

      await mailer.send({ ...message, to: professional.email });

      return { message: 'Convite enviado.' };
    },
  );
}
