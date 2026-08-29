import { cn } from '@/lib/cn';

export type SkeletonProps = {
  className?: string;
};

/**
 * Placeholder de carregamento. Fica escondido de leitores de tela porque o
 * estado de carregamento é anunciado pelo container com `aria-busy`.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-control bg-brown-100 animate-pulse motion-reduce:animate-none',
        className,
      )}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          // A última linha é mais curta, imitando o fim de um parágrafo.
          className={cn('h-4', index === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}
