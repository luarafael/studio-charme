import { createContext } from 'react';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export type ToastInput = {
  tone: ToastTone;
  title: string;
  description?: string;
};

export type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

/**
 * Fica em arquivo separado do provider para que o módulo do componente exporte
 * apenas componentes, permitindo o hot reload preservar o estado em edição.
 */
export const ToastContext = createContext<ToastContextValue | null>(null);
