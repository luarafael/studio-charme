import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const app = await buildApp(env);

  /**
   * Desligamento gracioso: o Railway envia SIGTERM ao trocar de release.
   * Fechar o Fastify permite que requisições em andamento terminem antes de o
   * processo morrer, evitando transações financeiras interrompidas no meio.
   */
  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'encerrando aplicação');
    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error }, 'falha ao encerrar aplicação');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    app.log.error({ err: reason }, 'promise rejeitada sem tratamento');
  });

  await app.listen({ host: env.HOST, port: env.PORT });
}

main().catch((error: unknown) => {
  // O logger do Fastify pode ainda não existir se a validação de ambiente falhar.
  process.stderr.write(
    `Falha ao iniciar a API: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
