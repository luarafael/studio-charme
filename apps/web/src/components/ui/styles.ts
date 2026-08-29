import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  // Dourado como preenchimento com texto marrom escuro: 4,7:1 de contraste.
  primary: 'bg-gold-500 text-brown-900 hover:bg-gold-400 active:bg-gold-600 shadow-card',
  secondary: 'bg-brown-900 text-cream hover:bg-brown-800 active:bg-brown-950 shadow-card',
  outline:
    'border border-brown-300 bg-transparent text-brown-900 hover:border-brown-900 hover:bg-brown-50',
  ghost: 'bg-transparent text-brown-800 hover:bg-brown-100',
  danger: 'bg-danger-500 text-white hover:bg-danger-700',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-base gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
};

/**
 * Classes do botão, também aplicáveis a elementos que não são `button`.
 *
 * Um link de navegação precisa continuar sendo `<a>` — para abrir em nova aba,
 * ser copiado e ser anunciado como link — mas com a mesma aparência do botão.
 * Aninhar `<a>` dentro de `<button>` seria HTML inválido.
 */
export function buttonClasses(
  options: {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    className?: string;
  } = {},
): string {
  const { variant = 'primary', size = 'md', fullWidth = false, className } = options;

  return cn(
    'inline-flex items-center justify-center rounded-control font-semibold whitespace-nowrap',
    'transition-[background-color,border-color,color,box-shadow,translate] duration-200 ease-brand',
    'disabled:pointer-events-none disabled:opacity-55',
    'hover:-translate-y-px active:translate-y-0 motion-reduce:hover:translate-y-0',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    className,
  );
}

/** Classes compartilhadas pelos controles, para manter altura e foco iguais. */
export const controlClasses = cn(
  'w-full min-w-0 rounded-control border bg-white px-3.5 py-2.5 text-base text-brown-900',
  'border-brown-200 placeholder:text-brown-400',
  'transition-[border-color,box-shadow] duration-200 ease-brand',
  'hover:border-brown-300',
  'focus:border-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-500/35',
  'disabled:cursor-not-allowed disabled:bg-brown-50 disabled:text-brown-400',
  'aria-[invalid=true]:border-danger-500 aria-[invalid=true]:ring-danger-500/25',
);
