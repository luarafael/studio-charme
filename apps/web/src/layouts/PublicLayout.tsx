import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingActions } from '@/components/layout/FloatingActions';

/**
 * Estrutura do site público. O link de pular navegação é o primeiro elemento
 * focável, permitindo que quem usa teclado chegue ao conteúdo sem percorrer o
 * menu inteiro em cada página.
 */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo">{children}</main>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
