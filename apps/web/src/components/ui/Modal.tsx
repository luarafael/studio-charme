import { useCallback, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { Button } from './Button';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /**
   * Impede fechar clicando fora ou com Esc. Use em operações destrutivas em
   * andamento, para não perder o que foi digitado por um clique acidental.
   */
  dismissible?: boolean;
};

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
};

/**
 * Diálogo acessível: `role="dialog"` com `aria-modal`, foco preso enquanto
 * aberto, retorno do foco ao fechar e fechamento por Esc ou clique no fundo.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = `${titleId}-description`;

  const handleEscape = useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);

  useFocusTrap(panelRef, open, handleEscape);
  useLockBodyScroll(open);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      {/*
        O fundo é apenas uma conveniência para o mouse, então fica escondido da
        tecnologia assistiva: quem usa leitor de tela fecha pelo botão do
        cabeçalho ou pela tecla Esc. Sem isso, seriam anunciados dois botões
        "Fechar" — e um deles não faria nada quando o diálogo não é dispensável.
      */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        data-testid="modal-overlay"
        onClick={dismissible ? onClose : undefined}
        className={cn(
          'bg-brown-950/55 absolute inset-0 backdrop-blur-[2px]',
          !dismissible && 'cursor-default',
        )}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'shadow-overlay relative flex max-h-[92vh] w-full flex-col overflow-hidden bg-white',
          'rounded-t-panel sm:rounded-panel',
          sizeClasses[size],
        )}
      >
        <div className="border-brown-100 flex items-start justify-between gap-4 border-b px-6 py-5">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-brown-900 text-xl">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-brown-600 text-sm">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Fechar"
              className="-mr-2 -mt-1 shrink-0 px-2"
            >
              <X className="size-5" aria-hidden="true" />
            </Button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="border-brown-100 bg-surface-muted flex flex-wrap justify-end gap-3 border-t px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
