import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    // Testes de integração compartilham o banco, então não podem rodar em paralelo.
    fileParallelism: false,
  },
});
