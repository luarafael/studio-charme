import { Link } from 'react-router';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { siteConfig } from '@/config/site';
import { buttonClasses } from '@/components/ui/styles';

export default function NotFoundPage() {
  useDocumentMeta({
    title: `Página não encontrada | ${siteConfig.name}`,
    // Página de erro não deve entrar no índice de busca.
    noIndex: true,
  });

  return (
    <PublicLayout>
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 pb-16 pt-28 text-center">
        <p className="font-display text-gold-700 text-sm uppercase tracking-[0.18em]">Erro 404</p>
        <h1 className="text-display-sm text-brown-900">Página não encontrada</h1>
        <p className="text-brown-600 max-w-md">
          O endereço que você acessou não existe ou foi movido. Volte para a página inicial para
          conhecer nossos serviços e agendar seu atendimento.
        </p>
        <Link to="/" className={buttonClasses({ variant: 'secondary' })}>
          Ir para a página inicial
        </Link>
      </div>
    </PublicLayout>
  );
}
