import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  sourcemap: true,
  clean: true,
  splitting: false,
  // O código compartilhado de contracts é distribuído como fonte TypeScript,
  // então precisa ser incluído no bundle em vez de resolvido em runtime.
  noExternal: ['@studio-charme/contracts'],
});
