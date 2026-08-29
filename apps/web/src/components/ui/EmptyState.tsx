import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  /** Explica o que fazer para sair do estado vazio, não apenas que está vazio. */
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-card border-brown-200 bg-surface-muted flex flex-col items-center justify-center gap-3 border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="text-brown-400" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="font-display text-brown-900 text-lg">{title}</p>
      {description && <p className="text-brown-600 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
