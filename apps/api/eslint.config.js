import { nodeConfig } from '@studio-charme/config/eslint';

export default [
  ...nodeConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      // A API usa o logger estruturado do Fastify; console vaza dados fora do contexto da requisição.
      'no-console': 'error',
    },
  },
  {
    files: ['prisma/**/*.ts', 'scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
