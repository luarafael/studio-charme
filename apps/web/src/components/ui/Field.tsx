import { useId, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export type FieldRenderProps = {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': boolean | undefined;
  'aria-required': boolean | undefined;
};

export type FieldProps = {
  label: string;
  /** Dica exibida antes de o campo ser preenchido. */
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: FieldRenderProps) => ReactNode;
};

/**
 * Estrutura acessível de campo de formulário.
 *
 * Gera o `id` e amarra label, dica e erro via `aria-describedby`, de modo que o
 * leitor de tela anuncie o motivo do erro junto com o campo. O erro não depende
 * apenas de cor: traz ícone e texto.
 */
export function Field({ label, hint, error, required = false, className, children }: FieldProps) {
  const generatedId = useId();
  const id = `field-${generatedId}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-brown-900 text-sm font-semibold">
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="text-danger-500 ml-0.5">
              *
            </span>
            <span className="sr-only"> (obrigatório)</span>
          </>
        )}
      </label>

      {hint && (
        <p id={hintId} className="text-brown-500 text-xs">
          {hint}
        </p>
      )}

      {children({
        id,
        'aria-describedby': describedBy === '' ? undefined : describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
      })}

      {error && (
        <p id={errorId} className="text-danger-700 flex items-start gap-1.5 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
