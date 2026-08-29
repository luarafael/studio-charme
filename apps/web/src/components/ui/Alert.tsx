import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const toneConfig: Record<
  AlertTone,
  { container: string; icon: typeof Info; iconClass: string; defaultTitle: string }
> = {
  info: {
    container: 'border-info-500/25 bg-info-50 text-info-700',
    icon: Info,
    iconClass: 'text-info-500',
    defaultTitle: 'Informação',
  },
  success: {
    container: 'border-success-500/25 bg-success-50 text-success-700',
    icon: CheckCircle2,
    iconClass: 'text-success-500',
    defaultTitle: 'Tudo certo',
  },
  warning: {
    container: 'border-warning-500/25 bg-warning-50 text-warning-700',
    icon: AlertTriangle,
    iconClass: 'text-warning-500',
    defaultTitle: 'Atenção',
  },
  danger: {
    container: 'border-danger-500/25 bg-danger-50 text-danger-700',
    icon: XCircle,
    iconClass: 'text-danger-500',
    defaultTitle: 'Erro',
  },
};

export type AlertProps = {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
  /** Ações contextuais, como "Tentar novamente". */
  actions?: ReactNode;
};

/**
 * Mensagem persistente na página, em vez de um toast que desaparece.
 * Erros de formulário e falhas de carregamento usam este componente para que a
 * informação continue disponível depois de alguns segundos.
 */
export function Alert({ tone = 'info', title, children, className, actions }: AlertProps) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <div
      // Erros são anunciados imediatamente; os demais avisos, de forma educada.
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-control flex gap-3 border p-4', config.container, className)}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', config.iconClass)} aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-2">
        <p className="font-semibold">{title ?? config.defaultTitle}</p>
        {children && <div className="text-sm">{children}</div>}
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
