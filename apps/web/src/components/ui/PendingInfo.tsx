import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PENDING_INFO_LABEL } from '@/config/site';

/**
 * Marcador para informação que o studio ainda não forneceu (preço, endereço,
 * horário). Deixa explícito para a visitante que o dado será confirmado, em vez
 * de mostrar um valor inventado que ela tomaria como verdadeiro.
 */
export function PendingInfo({
  label = PENDING_INFO_LABEL,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'bg-brown-100 text-brown-600 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        className,
      )}
    >
      <HelpCircle className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}
