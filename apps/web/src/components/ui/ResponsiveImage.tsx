import type { ImgHTMLAttributes } from 'react';
import imageManifest from '@/generated/image-manifest.json';
import { cn } from '@/lib/cn';

type ManifestEntry = {
  width: number;
  height: number;
  variants: { width: number; height: number; src: string }[];
};

const manifest = imageManifest as Record<string, ManifestEntry>;

export type ResponsiveImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'srcSet'> & {
  /** Caminho do arquivo original, ex.: `/assets/unha.png`. */
  src: string;
  alt: string;
  /** Atributo `sizes`, descrevendo o espaço que a imagem ocupa no layout. */
  sizes?: string;
  /** Imagem acima da dobra: carrega com prioridade e sem lazy loading. */
  priority?: boolean;
};

/**
 * Imagem responsiva com WebP e fallback para o arquivo original.
 *
 * As cópias otimizadas são geradas por `pnpm assets:optimize` e descritas em um
 * manifesto versionado. O `<source>` em WebP é oferecido primeiro; navegadores
 * que não o suportam recebem o PNG ou JPG original, que continua no projeto.
 *
 * As dimensões intrínsecas vêm do manifesto, o que reserva o espaço correto no
 * layout e evita que o conteúdo salte enquanto a imagem carrega.
 */
export function ResponsiveImage({
  src,
  alt,
  sizes = '100vw',
  priority = false,
  className,
  width,
  height,
  ...props
}: ResponsiveImageProps) {
  const entry = manifest[src];

  const loading = priority ? ('eager' as const) : ('lazy' as const);
  const fetchPriority = priority ? ('high' as const) : ('auto' as const);

  // `alt` é passado explicitamente em cada `img` (e não via spread) para que a
  // regra de acessibilidade do lint consiga verificar que ele existe.
  const commonProps = {
    loading,
    fetchPriority,
    decoding: 'async' as const,
    className: cn(className),
    width: width ?? entry?.width,
    height: height ?? entry?.height,
    ...props,
  };

  // Sem entrada no manifesto (imagem nova ainda não otimizada), usa o original.
  if (!entry || entry.variants.length === 0) {
    return <img src={src} alt={alt} {...commonProps} />;
  }

  const srcSet = entry.variants.map((variant) => `${variant.src} ${variant.width}w`).join(', ');

  return (
    <picture>
      <source type="image/webp" srcSet={srcSet} sizes={sizes} />
      <img src={src} alt={alt} sizes={sizes} {...commonProps} />
    </picture>
  );
}
