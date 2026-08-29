import { validationError } from './errors.js';

const MAX_IMAGE_BYTES = 400_000;

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP_WEBP = [0x57, 0x45, 0x42, 0x50];

function startsWith(bytes: Uint8Array, magic: readonly number[], offset = 0): boolean {
  return magic.every((value, index) => bytes[offset + index] === value);
}

export function toPrismaBytes(source: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return copy;
}

export function decodeUploadedImage(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
): { bytes: Uint8Array<ArrayBuffer>; mime: string } {
  const normalized = imageBase64.includes(',')
    ? imageBase64.slice(imageBase64.indexOf(',') + 1)
    : imageBase64;

  let decoded: Buffer;
  try {
    decoded = Buffer.from(normalized, 'base64');
  } catch {
    throw validationError([{ path: 'imageBase64', message: 'Não foi possível ler a foto.' }]);
  }

  if (decoded.length < 12 || decoded.length > MAX_IMAGE_BYTES) {
    throw validationError([
      { path: 'imageBase64', message: 'A foto precisa ter até 400 KB depois do ajuste.' },
    ]);
  }

  const view = new Uint8Array(decoded.byteLength);
  view.set(decoded);
  const valid =
    (mimeType === 'image/jpeg' && startsWith(view, JPEG_MAGIC)) ||
    (mimeType === 'image/png' && startsWith(view, PNG_MAGIC)) ||
    (mimeType === 'image/webp' && startsWith(view, WEBP_RIFF) && startsWith(view, WEBP_WEBP, 8));

  if (!valid) {
    throw validationError([{ path: 'mimeType', message: 'Envie uma foto JPG, PNG ou WebP.' }]);
  }

  return { bytes: toPrismaBytes(view), mime: mimeType };
}
