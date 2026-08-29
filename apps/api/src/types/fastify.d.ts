import type { PrismaClient } from '@prisma/client';
import type { AuthenticatedProfessional } from '@studio-charme/contracts';
import type { Env } from '../config/env.js';
import type { SessionService } from '../modules/auth/session-service.js';

declare module 'fastify' {
  interface FastifyInstance {
    env: Env;
    prisma: PrismaClient;
    sessions: SessionService;
    /** Exige sessão válida. Declarado no `preHandler` das rotas privadas. */
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Exige o cabeçalho CSRF nas mutações autenticadas. */
    requireCsrf: (request: FastifyRequest) => Promise<void>;
    /** Identifica a profissional se houver sessão, sem exigir autenticação. */
    optionalAuth: (request: FastifyRequest) => Promise<void>;
  }

  interface FastifyRequest {
    /** Preenchido por `requireAuth` ou `optionalAuth`. */
    professional: AuthenticatedProfessional | null;
    sessionId: string | null;
  }
}
