import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ToastContext, type ToastInput, type ToastTone } from './toast-context';

type Toast = ToastInput & { id: string };

const DEFAULT_DURATION = 6000;

const toneConfig: Record<ToastTone, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: 'text-info-500' },
  success: { icon: CheckCircle2, className: 'text-success-500' },
  warning: { icon: AlertTriangle, className: 'text-warning-500' },
  danger: { icon: XCircle, className: 'text-danger-500' },
};

/**
 * Avisos temporários.
 *
 * O toast é apenas um reforço: toda confirmação ou erro relevante também aparece
 * na própria página, porque uma mensagem que desaparece sozinha não serve como
 * único feedback para quem usa leitor de tela ou se distraiu por um instante.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { ...toast, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DEFAULT_DURATION),
      );
    },
    [dismiss],
  );

  // Limpa os temporizadores pendentes ao desmontar, evitando setState órfão.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        // `polite` evita interromper o que o leitor de tela está anunciando.
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        {toasts.map((toast) => {
          const config = toneConfig[toast.tone];
          const Icon = config.icon;

          return (
            <div
              key={toast.id}
              className="rounded-control border-brown-100 shadow-overlay pointer-events-auto flex w-full max-w-sm gap-3 border bg-white p-4"
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', config.className)} aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-brown-900 text-sm font-semibold">{toast.title}</p>
                {toast.description && <p className="text-brown-600 text-sm">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Fechar aviso"
                className="text-brown-400 hover:bg-brown-50 hover:text-brown-700 -mr-1 -mt-1 shrink-0 rounded p-1 transition-colors"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
