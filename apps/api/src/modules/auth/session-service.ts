import type { PrismaClient } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthenticatedProfessional } from '@studio-charme/contracts';
import type { Env } from '../../config/env.js';
import { generateToken, hashToken } from '../../lib/tokens.js';

/**
 * Sessão em cookie, e não JWT.
 *
 * Um JWT não pode ser invalidado antes de expirar: sair do sistema apenas
 * apagaria o token do navegador, e quem o tivesse copiado continuaria com acesso.
 * Aqui a sessão vive no banco e revogar é imediato — importante porque cada
 * profissional acessa dados de clientes.
 */

/** Cookie renovado quando falta menos que isto para expirar. */
const RENEW_THRESHOLD_RATIO = 0.5;

/** Evita uma escrita no banco a cada requisição só para atualizar o último acesso. */
const LAST_SEEN_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

export type SessionCreationContext = {
  ipAddress?: string;
  userAgent?: string;
  /** Sessão persistente ou apenas até fechar o navegador. */
  rememberMe: boolean;
};

export class SessionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly env: Env,
  ) {}

  private get ttlMs(): number {
    return this.env.SESSION_TTL_HOURS * 60 * 60 * 1000;
  }

  /**
   * Cria a sessão e envia o cookie.
   *
   * O token vai só para o cookie; o banco guarda apenas o hash, de modo que um
   * vazamento não permite assumir sessões ativas.
   */
  async create(
    reply: FastifyReply,
    professionalId: string,
    context: SessionCreationContext,
  ): Promise<void> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + this.ttlMs);

    await this.prisma.session.create({
      data: {
        tokenHash: hashToken(token),
        professionalId,
        ipAddress: context.ipAddress?.slice(0, 60) ?? null,
        userAgent: context.userAgent?.slice(0, 300) ?? null,
        expiresAt,
      },
    });

    this.setCookie(reply, token, context.rememberMe ? expiresAt : null);
  }

  /**
   * Resolve a sessão do cookie.
   *
   * Devolve nulo para cookie ausente, sessão inexistente, expirada, revogada ou
   * de profissional desativada. Nenhum desses casos é distinguido na resposta:
   * todos resultam no mesmo 401, para não informar qual foi o motivo.
   */
  async resolve(
    request: FastifyRequest,
  ): Promise<{ professional: AuthenticatedProfessional; sessionId: string } | null> {
    const token = request.cookies[this.env.SESSION_COOKIE_NAME];
    if (!token) return null;

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      select: {
        id: true,
        expiresAt: true,
        revokedAt: true,
        lastSeenAt: true,
        professional: {
          select: {
            id: true,
            slug: true,
            name: true,
            email: true,
            role: true,
            photoUrl: true,
            isActive: true,
          },
        },
      },
    });

    if (!session) return null;
    if (session.revokedAt !== null) return null;
    if (session.expiresAt.getTime() <= Date.now()) return null;
    // Conta desativada perde o acesso imediatamente, sem esperar a sessão expirar.
    if (!session.professional.isActive) return null;

    await this.touch(session.id, session.lastSeenAt);

    const { isActive: _isActive, ...professional } = session.professional;
    return { professional, sessionId: session.id };
  }

  /** Atualiza o último acesso, sem escrever a cada requisição. */
  private async touch(sessionId: string, lastSeenAt: Date): Promise<void> {
    if (Date.now() - lastSeenAt.getTime() < LAST_SEEN_UPDATE_INTERVAL_MS) return;

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    });
  }

  /**
   * Estende a sessão de quem está usando o sistema.
   *
   * Sem isso, a profissional seria desconectada no meio do dia ao completar o
   * prazo, mesmo trabalhando. A renovação só ocorre depois de passada metade do
   * prazo, para não gravar no banco a toda hora.
   */
  async renewIfNeeded(reply: FastifyReply, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { expiresAt: true },
    });
    if (!session) return;

    const remaining = session.expiresAt.getTime() - Date.now();
    if (remaining > this.ttlMs * RENEW_THRESHOLD_RATIO) return;

    const expiresAt = new Date(Date.now() + this.ttlMs);
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt },
    });

    const token = reply.request.cookies[this.env.SESSION_COOKIE_NAME];
    if (token) this.setCookie(reply, token, expiresAt);
  }

  /** Revoga a sessão atual e limpa o cookie. */
  async destroy(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const token = request.cookies[this.env.SESSION_COOKIE_NAME];

    if (token) {
      // updateMany não falha quando não há registro correspondente, o que evita
      // erro ao sair com um cookie já inválido.
      await this.prisma.session.updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    this.clearCookie(reply);
  }

  /**
   * Revoga todas as sessões da profissional.
   *
   * Usado ao trocar ou redefinir a senha: quem tiver entrado com a senha antiga
   * em outro dispositivo perde o acesso na hora, que é justamente o objetivo de
   * quem troca a senha por suspeita de acesso indevido.
   */
  async revokeAllForProfessional(professionalId: string, exceptSessionId?: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        professionalId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });

    return result.count;
  }

  /** Remove sessões expiradas e revogadas antigas. */
  async purgeExpired(olderThanDays = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }],
      },
    });

    return result.count;
  }

  private get cookieOptions() {
    return {
      // Inacessível a JavaScript: um XSS não consegue ler a sessão.
      httpOnly: true,
      // Só trafega por HTTPS. Falso apenas no localhost, sem TLS.
      secure: this.env.COOKIE_SECURE,
      /**
       * `lax` permite que a profissional chegue autenticada ao clicar num link
       * externo, mas não envia o cookie em requisição de outro site, o que
       * bloqueia CSRF nas rotas que alteram dados.
       */
      sameSite: 'lax' as const,
      path: '/',
      ...(this.env.COOKIE_DOMAIN ? { domain: this.env.COOKIE_DOMAIN } : {}),
    };
  }

  private setCookie(reply: FastifyReply, token: string, expiresAt: Date | null): void {
    reply.setCookie(this.env.SESSION_COOKIE_NAME, token, {
      ...this.cookieOptions,
      // Sem `expires`, o cookie dura só a sessão do navegador.
      ...(expiresAt ? { expires: expiresAt } : {}),
    });
  }

  private clearCookie(reply: FastifyReply): void {
    reply.clearCookie(this.env.SESSION_COOKIE_NAME, this.cookieOptions);
  }
}
