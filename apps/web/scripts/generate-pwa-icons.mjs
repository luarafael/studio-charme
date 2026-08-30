/**
 * Gera ícones do PWA a partir de public/assets/SC.png.
 * O iPhone exige PNG 180×180 (apple-touch-icon) e 192/512 no manifesto.
 *
 * Uso: pnpm --filter @studio-charme/web pwa:icons
 */

import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'public/assets/SC.png');
const OUTPUT_DIR = join(ROOT, 'public/assets/pwa');
const BACKGROUND = { r: 250, g: 248, b: 245, alpha: 1 };

async function writeIcon(size, fileName, paddingRatio) {
  const pad = Math.round(size * paddingRatio);
  const inner = Math.max(1, size - pad * 2);
  const logo = await sharp(SOURCE)
    .resize(inner, inner, { fit: 'contain', background: BACKGROUND })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: logo, left: pad, top: pad }])
    .png()
    .toFile(join(OUTPUT_DIR, fileName));
}

await mkdir(OUTPUT_DIR, { recursive: true });
await writeIcon(180, 'icon-180.png', 0.12);
await writeIcon(192, 'icon-192.png', 0.12);
await writeIcon(512, 'icon-512.png', 0.12);
await writeIcon(512, 'icon-512-maskable.png', 0.2);
console.log('Ícones do PWA gerados em public/assets/pwa');
