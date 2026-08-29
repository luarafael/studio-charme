import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'node:crypto';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Env } from './config/env.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import envPlugin from './plugins/env.js';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './modules/auth/routes.js';
import { agendaRoutes } from './modules/agenda/routes.js';
import { financeRoutes } from './modules/finance/routes.js';
import { availabilityRoutes } from './modules/availability/routes.js';
import { publicBookingRoutes } from './modules/public-booking/routes.js';
import type { AppInstance } from './types/app.js';

export const API_PREFIX = '/api/v1';

export async function buildApp(env: Env): Promise<AppInstance> {
  const app = Fastify({
    // Testes não precisam de log e ele só poluiria a saída do Vitest.
    logger:
      env.NODE_ENV === 'test'
        ? false
        : {
            level: env.LOG_LEVEL,
            // Nunca registrar cookies, tokens ou corpo de requisição: eles carregam
            // sessão, senhas e dados pessoais das clientes.
            redact: {
              paths: [
                'req.headers.cookie',
                'req.headers.authorization',
                'req.headers["x-csrf-token"]',
                'res.headers["set-cookie"]',
              ],
              censor: '[redigido]',
            },
            serializers: {
              req: (request) => ({
                method: request.method,
                url: request.url,
                remoteAddress: request.ip,
              }),
            },
            ...(env.NODE_ENV === 'development'
              ? {
                  transport: {
                    target: 'pino-pretty',
                    options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
                  },
                }
              : {}),
          },
    genReqId: () => randomUUID(),
    trustProxy: true,
    bodyLimit: 1_048_576,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(envPlugin, { env });

  await app.register(helmet, {
    // A API só devolve JSON; a política de conteúdo do site é definida na Vercel.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: env.NODE_ENV === 'production' ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  });

  await app.register(cors, {
    origin: env.WEB_ORIGINS,
    // Obrigatório para o cookie de sessão trafegar entre Vercel e Railway.
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Idempotency-Key'],
    maxAge: 86_400,
  });

  await app.register(cookie, {
    secret: env.SESSION_SECRET,
    parseOptions: {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAMESITE,
      path: '/',
      ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    },
  });

  await app.register(rateLimit, {
    global: false,
    max: 120,
    timeWindow: '1 minute',
  });

  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: API_PREFIX });
  await app.register(agendaRoutes, { prefix: API_PREFIX });
  await app.register(financeRoutes, { prefix: API_PREFIX });
  await app.register(availabilityRoutes, { prefix: API_PREFIX });
  await app.register(publicBookingRoutes, { prefix: API_PREFIX });

  return app;
}

/** Tipo auxiliar para testes que ainda recebem FastifyInstance genérico. */
export type BuiltApp = FastifyInstance;
