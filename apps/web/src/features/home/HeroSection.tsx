import { CalendarCheck, MessageCircle, Sparkles } from 'lucide-react';
import { brandAssets, buildWhatsAppUrl, siteConfig } from '@/config/site';
import { siteQuestionMessage } from '@/lib/whatsappMessages';
import { buttonClasses } from '@/components/ui/styles';
import { Container } from '@/components/layout/Container';

export function HeroSection() {
  return (
    <section
      id="inicio"
      className="bg-brown-900 pb-section md:pb-section-lg relative overflow-hidden pt-28 md:pt-36"
    >
      {/* Brilho decorativo leve, sem custo de imagem ou animação. */}
      <div
        aria-hidden="true"
        className="bg-gold-500/10 pointer-events-none absolute -right-24 -top-32 size-[28rem] rounded-full blur-3xl"
      />

      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col items-start gap-6 text-left">
            <p className="bg-brown-800 text-gold-400 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {siteConfig.tagline}
            </p>

            <h1 className="text-display-md text-cream md:text-display-lg">
              Sua beleza merece o<span className="text-gold-400"> melhor cuidado</span>
            </h1>

            <p className="text-brown-200 max-w-xl text-lg">
              No {siteConfig.name}, cada detalhe é pensado para realçar sua beleza, elevar sua
              autoestima e proporcionar momentos únicos de cuidado e relaxamento.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#agendar" className={buttonClasses({ size: 'lg', variant: 'primary' })}>
                <CalendarCheck className="size-5" aria-hidden="true" />
                Agendar agora
              </a>

              <a
                href={buildWhatsAppUrl(siteConfig.primaryWhatsApp, siteQuestionMessage())}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({
                  size: 'lg',
                  variant: 'outline',
                  className: 'border-brown-600 text-cream hover:border-gold-400 hover:bg-brown-800',
                })}
              >
                <MessageCircle className="size-5" aria-hidden="true" />
                Falar no WhatsApp
              </a>
            </div>

            <dl className="border-brown-800 mt-2 flex flex-wrap gap-x-8 gap-y-3 border-t pt-6">
              <div>
                <dt className="text-brown-400 text-xs uppercase tracking-wider">Profissionais</dt>
                <dd className="font-display text-gold-400 text-2xl">3</dd>
              </div>
              <div>
                <dt className="text-brown-400 text-xs uppercase tracking-wider">Especialidades</dt>
                <dd className="font-display text-gold-400 text-2xl">Unhas, cabelo e olhar</dd>
              </div>
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              aria-hidden="true"
              className="bg-gold-500/15 absolute inset-4 rounded-full blur-2xl"
            />
            <img
              src={brandAssets.logoFull}
              alt={`Logo do ${siteConfig.name}`}
              width={520}
              height={520}
              // Imagem principal acima da dobra: carrega com prioridade alta e
              // sem lazy, porque é o maior elemento visível no primeiro paint.
              fetchPriority="high"
              decoding="async"
              className="relative mx-auto w-full max-w-sm object-contain lg:max-w-md"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
