/**
 * Gera versões otimizadas das imagens do site.
 *
 * Os arquivos originais em `public/assets` NÃO são alterados nem removidos: as
 * fotos são o material real das profissionais e precisam ser preservadas na
 * qualidade em que foram entregues. As cópias vão para `public/assets/optimized`
 * em WebP e em várias larguras, para o navegador baixar só o tamanho que cabe na
 * tela.
 *
 * Uso: pnpm --filter @studio-charme/web assets:optimize
 */

import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ASSETS_DIR = fileURLToPath(new URL('../public/assets', import.meta.url));
const OUTPUT_DIR = join(ASSETS_DIR, 'optimized');
// O manifesto vive em `src` para ser importado e tipado no build. Ele é versionado,
// de modo que compilar o projeto não exija rodar o sharp novamente.
const MANIFEST_DIR = fileURLToPath(new URL('../src/generated', import.meta.url));
const MANIFEST_PATH = join(MANIFEST_DIR, 'image-manifest.json');

/** Larguras alinhadas aos tamanhos em que as imagens realmente aparecem. */
const WIDTHS = [400, 800, 1200];
const SOURCE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const WEBP_QUALITY = 82;

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(0)} kB`;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(MANIFEST_DIR, { recursive: true });

  const entries = await readdir(ASSETS_DIR, { withFileTypes: true });
  const sources = entries
    .filter((entry) => entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry) => entry.name);

  if (sources.length === 0) {
    console.warn('Nenhuma imagem encontrada em public/assets.');
    return;
  }

  const manifest = {};
  let originalTotal = 0;
  let optimizedTotal = 0;

  for (const fileName of sources) {
    const inputPath = join(ASSETS_DIR, fileName);
    const name = basename(fileName, extname(fileName));

    const original = await stat(inputPath);
    originalTotal += original.size;

    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const intrinsicWidth = metadata.width ?? 0;
    const intrinsicHeight = metadata.height ?? 0;

    const variants = [];

    for (const width of WIDTHS) {
      // Nunca amplia: gerar uma cópia maior que o original só piora o arquivo.
      if (intrinsicWidth > 0 && width > intrinsicWidth) continue;

      const outputName = `${name}-${width}.webp`;
      const outputPath = join(OUTPUT_DIR, outputName);

      const info = await sharp(inputPath)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(outputPath);

      optimizedTotal += info.size;
      variants.push({
        width: info.width,
        height: info.height,
        src: `/assets/optimized/${outputName}`,
      });
    }

    if (variants.length === 0) continue;

    manifest[`/assets/${fileName}`] = {
      width: intrinsicWidth,
      height: intrinsicHeight,
      variants,
    };

    const largest = variants[variants.length - 1];
    console.log(
      `${fileName.padEnd(32)} ${formatBytes(original.size).padStart(9)} -> ${variants.length} webp (maior: ${largest.width}px)`,
    );
  }

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(
    `\nOriginais preservados: ${formatBytes(originalTotal)}. Cópias WebP geradas: ${formatBytes(optimizedTotal)}.`,
  );
  console.log(`Manifesto: ${MANIFEST_PATH}`);
}

main().catch((error) => {
  console.error('Falha ao otimizar imagens:', error);
  process.exit(1);
});
