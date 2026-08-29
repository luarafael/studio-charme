import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { Env } from '../config/env.js';

/**
 * Publica a configuração validada em `app.env`.
 *
 * Registrar como plugin permite que os demais declarem `dependencies: ['env']`,
 * garantindo a ordem de inicialização em vez de depender da ordem de escrita.
 */
const envPlugin: FastifyPluginAsync = async (app, options) => {
  app.decorate('env', (options as { env: Env }).env);
};

export default fp(envPlugin, { name: 'env' });
