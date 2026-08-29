import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../lib/errors.js';
import { SessionService } from '../modules/auth/session-service.js';

/**
 * Autenticação por sessão.
 *
 * Expõe `request.professional` e o gancho `app.requireAuth`, que as rotas
 * privadas declaram em `preHandler`. A verificação é explícita por rota: um
 * gancho global que protegesse tudo por padrão daria a impressão de segurança,
 * mas bastaria alguém registrar uma rota fora dele para abrir um vazamento
 * silencioso. Aqui, esquecer o `requireAuth` deixa a rota visivelmente pública
 * na leitura do código.
 */
const authPlugin: FastifyPluginAsync = async (app) => {
  const sessions = new SessionService(app.prisma, app.env);
  app.decorate('sessions', sessions);

  app.decorate('requireAuth', async function requireAuth(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const resolved = await sessions.resolve(request);

    if (!resolved) {
      // Mensagem única para cookie ausente, expirado, revogado ou de conta
      // desativada: distinguir os casos ajudaria a sondar contas.
      throw new AppError('UNAUTHORIZED', 'Sua sessão expirou. Entre novamente.', 401);
    }

    request.professional = resolved.professional;
    request.sessionId = resolved.sessionId;

    await sessions.renewIfNeeded(reply, resolved.sessionId);
  });

  /**
   * Identifica a profissional quando houver sessão, sem exigir autenticação.
   * Usado em rotas públicas que mudam de comportamento para quem já está logada.
   */
  app.decorate('optionalAuth', async function optionalAuth(request: FastifyRequest) {
    const resolved = await sessions.resolve(request);
    if (resolved) {
      request.professional = resolved.professional;
      request.sessionId = resolved.sessionId;
    }
  });

  // Inicializa os campos para que `request.professional` seja sempre um acesso
  // válido, em vez de undefined em rotas que não passaram pelo gancho.
  app.decorateRequest('professional', null);
  app.decorateRequest('sessionId', null);
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['prisma', 'env'],
});
