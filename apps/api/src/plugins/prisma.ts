import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { createPrismaClient } from '../lib/prisma.js';

/**
 * Disponibiliza o cliente do banco em `app.prisma` e fecha a conexão junto com o
 * servidor, para o processo não ficar preso com o pool aberto no encerramento.
 */
const prismaPlugin: FastifyPluginAsync = async (app) => {
  const prisma = createPrismaClient(app.env);

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
};

export default fp(prismaPlugin, { name: 'prisma', dependencies: ['env'] });
