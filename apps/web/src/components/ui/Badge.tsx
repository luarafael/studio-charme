import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'gold' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-brown-100 text-brown-800 ring-brown-200',
  gold: 'bg-gold-100 text-gold-800 ring-gold-200',
  success: 'bg-success-50 text-success-700 ring-success-500/25',
  warning: 'bg-warning-50 text-warning-700 ring-warning-500/25',
  danger: 'bg-danger-50 text-danger-700 ring-danger-500/25',
  info: 'bg-info-50 text-info-700 ring-info-500/25',
};

export type BadgeProps = {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
  /**
   * Marcador de forma exibido junto ao texto. Status na agenda não pode ser
   * comunicado só por cor, então o ponto ajuda a diferenciar por posição/forma.
   */
  withDot?: boolean;
};

export function Badge({ tone = 'neutral', className, children, withDot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        toneClasses[tone],
        className,
      )}
    >
      {withDot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
