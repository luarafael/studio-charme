import { ArrowUp, MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl, siteConfig } from '@/config/site';
import { cn } from '@/lib/cn';
import { useScrolledPast } from '@/hooks/useScrolledPast';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

/**
 * Ações flutuantes: WhatsApp e voltar ao topo.
 *
 * O WhatsApp aparece só no celular, onde o app está instalado e o contato é
 * imediato; no desktop os links de contato da página já cumprem esse papel sem
 * cobrir o conteúdo.
 */
export function FloatingActions() {
  const showBackToTop = useScrolledPast(400);
  const prefersReducedMotion = usePrefersReducedMotion();

  const scrollToTop = (): void => {
    window.scrollTo({
      top: 0,
      // `smooth` ignora a preferência do sistema, então decidimos aqui.
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
      <div className="max-w-content mx-auto flex items-end justify-between px-4 pb-4 sm:px-8">
        <a
          href={buildWhatsAppUrl(
            siteConfig.primaryWhatsApp,
            `Olá! Vim pelo site do ${siteConfig.name} e gostaria de agendar um atendimento.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="h-13 shadow-overlay pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 sm:hidden"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          WhatsApp
        </a>

        {/* Espaçador para o botão de topo ficar à direita quando o WhatsApp não aparece. */}
        <span className="hidden sm:block" aria-hidden="true" />

        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Voltar ao topo"
          className={cn(
            'bg-brown-900 text-gold-400 shadow-overlay pointer-events-auto inline-flex size-12 items-center justify-center rounded-full',
            'ease-brand transition-[opacity,translate] duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
            showBackToTop ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          // Retirado da ordem de tabulação quando invisível, para o teclado não
          // parar num botão que a usuária não vê.
          tabIndex={showBackToTop ? 0 : -1}
          aria-hidden={!showBackToTop}
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
