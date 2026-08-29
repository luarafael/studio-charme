/**
 * Gera `robots.txt` e `sitemap.xml` a partir do domínio configurado.
 *
 * As URLs absolutas destes arquivos precisam apontar para o endereço real de
 * produção. Escrevê-las à mão significaria publicar um sitemap apontando para o
 * domínio errado se ele mudar, então elas vêm de `VITE_SITE_URL` e são geradas
 * no build.
 *
 * Uso: pnpm --filter @studio-charme/web seo:generate
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url));

// Sem a variável definida, cai no domínio de preview da Vercel e avisa.
const FALLBACK_URL = 'https://studio-charme.vercel.app';
const rawSiteUrl = process.env.VITE_SITE_URL ?? FALLBACK_URL;

if (!process.env.VITE_SITE_URL) {
  console.warn(
    `[seo] VITE_SITE_URL não definida. Usando ${FALLBACK_URL}.\n` +
      '[seo] Defina o domínio real antes de publicar, senão o sitemap aponta para o lugar errado.',
  );
}

// Remove a barra final para não gerar URLs com barra dupla.
const siteUrl = rawSiteUrl.replace(/\/+$/, '');

/** Rotas públicas indexáveis. A área interna fica fora de propósito. */
const publicRoutes = [
  { path: '/', changefreq: 'monthly', priority: '1.0' },
  { path: '/politica-de-privacidade', changefreq: 'yearly', priority: '0.3' },
  { path: '/termos-de-uso', changefreq: 'yearly', priority: '0.3' },
];

const disallowedPaths = ['/app/', '/entrar', '/recuperar-senha', '/definir-senha'];

const robots = `User-agent: *
Allow: /

# A área interna das profissionais não deve ser indexada.
${disallowedPaths.map((path) => `Disallow: ${path}`).join('\n')}

Sitemap: ${siteUrl}/sitemap.xml
`;

const lastModified = new Date().toISOString().slice(0, 10);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicRoutes
  .map(
    (route) => `  <url>
    <loc>${siteUrl}${route.path}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

await writeFile(join(PUBLIC_DIR, 'robots.txt'), robots, 'utf8');
await writeFile(join(PUBLIC_DIR, 'sitemap.xml'), sitemap, 'utf8');

console.log(`[seo] robots.txt e sitemap.xml gerados para ${siteUrl}`);
