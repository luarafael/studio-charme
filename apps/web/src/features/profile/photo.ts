import { brandAssets } from '@/config/site';
import { resolveApiUrl } from '@/lib/api';

export function professionalPhotoSrc(photoUrl: string | null | undefined): string {
  if (!photoUrl) return brandAssets.logoMark;
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
  const apiUrl = resolveApiUrl(import.meta.env.VITE_API_URL as string | undefined);
  return `${apiUrl}/api/v1${photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`}`;
}

const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const OUTPUT_SIZE = 512;

export async function prepareProfilePhoto(
  file: File,
): Promise<{ imageBase64: string; mimeType: 'image/jpeg' }> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Use uma foto JPG, PNG ou WebP.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('A foto pode ter no máximo 8 MB.');
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Não foi possível preparar a foto.');
  }

  const scale = Math.max(OUTPUT_SIZE / bitmap.width, OUTPUT_SIZE / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  context.drawImage(bitmap, (OUTPUT_SIZE - width) / 2, (OUTPUT_SIZE - height) / 2, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Não foi possível preparar a foto.'))),
      'image/jpeg',
      0.88,
    );
  });

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler a foto.'));
    reader.readAsDataURL(blob);
  });

  const comma = dataUrl.indexOf(',');
  return {
    imageBase64: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl,
    mimeType: 'image/jpeg',
  };
}
