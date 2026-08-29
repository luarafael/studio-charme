import type { FastifyInstance } from 'fastify';

/**
 * Endpoint de saúde para o Railway.
 *
 * Responde sem tocar no banco, para o load balancer não derrubar a instância por
 * lentidão do Neon, e não revela versão, host nem detalhes de configuração.
 * A verificação de prontidão do banco é adicionada junto com o Prisma.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', { logLevel: 'warn' }, async () => ({
    status: 'ok' as const,
    uptime: Math.round(process.uptime()),
  }));
}
