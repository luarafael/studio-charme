import { useCallback, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { Button } from './Button';

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: 'right' | 'left';
};

/**
 * Painel lateral com as mesmas garantias de acessibilidade do Modal.
 * Usado para filtros e formulários auxiliares onde o contexto da página atrás
 * ainda é relevante.
 */
export function Drawer({ open, onClose, title, children, footer, side = 'right' }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const handleEscape = useCallback(() => onClose(), [onClose]);

  useFocusTrap(panelRef, open, handleEscape);
  useLockBodyScroll(open);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Escondido da tecnologia assistiva: o fechamento acessível é o botão do
          cabeçalho e a tecla Esc. Ver a mesma decisão no Modal. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        data-testid="drawer-overlay"
        onClick={onClose}
        className="bg-brown-950/55 absolute inset-0 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'shadow-overlay absolute inset-y-0 flex w-full max-w-sm flex-col bg-white',
          side === 'right' ? 'right-0' : 'left-0',
        )}
      >
        <div className="border-brown-100 flex items-center justify-between gap-4 border-b px-5 py-4">
          <h2 id={titleId} className="text-brown-900 text-lg">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-2 shrink-0 px-2"
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="border-brown-100 bg-surface-muted flex flex-wrap justify-end gap-3 border-t px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
