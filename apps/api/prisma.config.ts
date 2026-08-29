import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Configuração do Prisma CLI.
 *
 * Substitui o campo `prisma` do package.json, descontinuado. O `dotenv/config`
 * no topo carrega o `.env` da aplicação antes de o CLI ler a `DATABASE_URL`.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
