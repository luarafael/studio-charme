import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Largura máxima e respiro laterais consistentes em todas as seções. */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('max-w-content mx-auto w-full px-5 sm:px-8', className)}>{children}</div>
  );
}
