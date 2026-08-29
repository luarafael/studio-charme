import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Container } from './Container';

/** Estrutura comum das páginas legais, com data de atualização visível. */
export function LegalPage({
  title,
  intro,
  updatedAt,
  children,
}: {
  title: string;
  intro: ReactNode;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <PublicLayout>
      <div className="bg-brown-900 pb-14 pt-28">
        <Container>
          <Link
            to="/"
            className="text-gold-400 hover:text-gold-300 inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para a página inicial
          </Link>
          <h1 className="text-display-sm text-cream md:text-display-md mt-5">{title}</h1>
          <p className="text-brown-200 mt-3 max-w-2xl">{intro}</p>
        </Container>
      </div>

      <Container className="max-w-3xl py-14">
        <p className="text-brown-500 text-sm">Última atualização: {updatedAt}</p>
        <div className="prose-charme mt-6">{children}</div>
      </Container>
    </PublicLayout>
  );
}
