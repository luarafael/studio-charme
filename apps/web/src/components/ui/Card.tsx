import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type CardProps = HTMLAttributes<HTMLElement> & {
  /** Aplica elevação e leve subida no hover. Use só em cards clicáveis. */
  interactive?: boolean;
  as?: 'div' | 'article' | 'section' | 'li';
};

export function Card({
  interactive = false,
  as: Component = 'div',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        'rounded-card border-brown-100 shadow-card border bg-white',
        interactive &&
          'ease-brand hover:border-gold-200 hover:shadow-card-hover transition-[box-shadow,translate,border-color] duration-200 hover:-translate-y-1 motion-reduce:hover:translate-y-0',
        // Realce quando o foco está em algo dentro do card (navegação por teclado).
        interactive && 'focus-within:border-gold-400 focus-within:shadow-card-hover',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

export function CardTitle({
  className,
  children,
  as: Component = 'h3',
}: {
  className?: string;
  children: ReactNode;
  as?: 'h2' | 'h3' | 'h4';
}) {
  return <Component className={cn('text-brown-900 text-xl', className)}>{children}</Component>;
}
