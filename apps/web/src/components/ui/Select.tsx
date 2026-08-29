import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { controlClasses } from './styles';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/**
 * Usa o `select` nativo em vez de um dropdown customizado: no celular abre o
 * seletor do sistema, já funciona com teclado e leitor de tela, e não precisa de
 * JavaScript para ser acessível.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(controlClasses, 'appearance-none pr-10', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="text-brown-500 pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
    </div>
  );
});
