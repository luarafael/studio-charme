import { Link } from 'react-router';
import { Instagram, MessageCircle } from 'lucide-react';
import { brandAssets, buildWhatsAppUrl, siteConfig } from '@/config/site';
import { Container } from './Container';

export function SiteFooter() {
  // O site antigo tinha "2025" fixo no rodapé e envelhecia sozinho a cada ano.
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-brown-800 bg-brown-950 border-t py-12">
      <Container>
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="flex max-w-sm flex-col gap-4">
            <div className="flex items-center gap-3">
              <img
                src={brandAssets.logoMark}
                alt=""
                width={40}
                height={40}
                className="size-10 rounded-full object-cover"
              />
              <span className="font-display text-gold-400 text-lg font-bold">
                {siteConfig.name}
              </span>
            </div>
            <p className="text-brown-300 text-sm">{siteConfig.shortDescription}</p>
          </div>

          <nav aria-label="Links do rodapé">
            <h2 className="font-display text-gold-400 text-sm font-semibold uppercase tracking-wider">
              Navegação
            </h2>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              <li>
                <a href="/#servicos" className="text-brown-200 hover:text-cream transition-colors">
                  Serviços
                </a>
              </li>
              <li>
                <a
                  href="/#profissionais"
                  className="text-brown-200 hover:text-cream transition-colors"
                >
                  Profissionais
                </a>
              </li>
              <li>
                <a href="/#agendar" className="text-brown-200 hover:text-cream transition-colors">
                  Agendar atendimento
                </a>
              </li>
              <li>
                <Link
                  to="/politica-de-privacidade"
                  className="text-brown-200 hover:text-cream transition-colors"
                >
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  to="/termos-de-uso"
                  className="text-brown-200 hover:text-cream transition-colors"
                >
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link
                  to="/entrar"
                  className="text-brown-200 hover:text-cream transition-colors"
                >
                  Entrar
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="font-display text-gold-400 text-sm font-semibold uppercase tracking-wider">
              Fale com a gente
            </h2>
            <div className="mt-4 flex gap-3">
              <a
                href={siteConfig.social.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram do ${siteConfig.name}`}
                className="rounded-control bg-brown-900 text-gold-400 hover:bg-gold-500 hover:text-brown-900 inline-flex size-11 items-center justify-center transition-colors"
              >
                <Instagram className="size-5" aria-hidden="true" />
              </a>
              <a
                href={buildWhatsAppUrl(siteConfig.primaryWhatsApp)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`WhatsApp do ${siteConfig.name}`}
                className="rounded-control bg-brown-900 text-gold-400 hover:bg-gold-500 hover:text-brown-900 inline-flex size-11 items-center justify-center transition-colors"
              >
                <MessageCircle className="size-5" aria-hidden="true" />
              </a>
            </div>
            <p className="text-brown-300 mt-4 text-sm">@{siteConfig.social.instagramHandle}</p>
          </div>
        </div>

        <div className="border-brown-800 mt-10 border-t pt-6 text-center">
          <p className="font-display text-brown-400 text-xs">
            © {currentYear} {siteConfig.name}. Todos os direitos reservados.
          </p>
        </div>
      </Container>
    </footer>
  );
}
