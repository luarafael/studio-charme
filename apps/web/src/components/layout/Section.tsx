import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Container } from './Container';

export type SectionProps = {
  id?: string;
  /** Fundo da seção, alternado para criar o ritmo editorial da página. */
  tone?: 'light' | 'muted' | 'dark';
  className?: string;
  children: ReactNode;
};

const toneClasses = {
  light: 'bg-white',
  muted: 'bg-surface-muted',
  dark: 'bg-brown-900',
};

export function Section({ id, tone = 'light', className, children }: SectionProps) {
  return (
    <section
      id={id}
      // scroll-mt compensa o header fixo quando a seção é alvo de uma âncora.
      className={cn('py-section md:py-section-lg scroll-mt-24', toneClasses[tone], className)}
    >
      <Container>{children}</Container>
    </section>
  );
}

export type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  tone?: 'light' | 'dark';
  align?: 'left' | 'center';
  /** Nível do título, para manter a hierarquia correta na página. */
  as?: 'h2' | 'h3';
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  tone = 'light',
  align = 'center',
  as: Heading = 'h2',
}: SectionHeaderProps) {
  const isDark = tone === 'dark';

  return (
    <header
      className={cn(
        'flex flex-col gap-3',
        align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl',
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            'text-xs font-semibold uppercase tracking-[0.18em]',
            // Dourado claro só sobre fundo escuro; no claro usa o tom acessível.
            isDark ? 'text-gold-400' : 'text-gold-700',
          )}
        >
          {eyebrow}
        </p>
      )}
      <Heading
        className={cn(
          'text-display-sm md:text-display-md',
          isDark ? 'text-cream' : 'text-brown-900',
        )}
      >
        {title}
      </Heading>
      {description && (
        <p className={cn('text-base', isDark ? 'text-brown-200' : 'text-brown-600')}>
          {description}
        </p>
      )}
    </header>
  );
}
