import type { FastifyInstance } from 'fastify';

/**
 * Endpoints de saúde para o Railway.
 *
 * `/health` não toca no banco, para o load balancer não derrubar a instância por
 * lentidão do Neon. `/health/ready` confirma o banco e nenhum dos dois revela
 * versão, host ou detalhes de configuração.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', { logLevel: 'warn' }, async () => ({
    status: 'ok' as const,
    uptime: Math.round(process.uptime()),
  }));

  app.get('/health/ready', { logLevel: 'warn' }, async (_request, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' as const };
    } catch (error) {
      app.log.error({ err: error }, 'verificação de prontidão falhou');
      return reply.status(503).send({ status: 'unavailable' as const });
    }
  });
}
