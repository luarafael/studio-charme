import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { brandAssets, siteConfig } from '@/config/site';
import { useScrolledPast } from '@/hooks/useScrolledPast';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { buttonClasses } from '@/components/ui/styles';
import { Container } from './Container';

const navigation = [
  // A grafia correta é "Início": o site atual exibia "Inicio", sem acento.
  { label: 'Início', href: '/#inicio' },
  { label: 'Sobre', href: '/#sobre' },
  { label: 'Serviços', href: '/#servicos' },
  { label: 'Profissionais', href: '/#profissionais' },
  { label: 'Galeria', href: '/#galeria' },
  { label: 'Contato', href: '/#contato' },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolledPast(24);
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useLockBodyScroll(menuOpen);
  useFocusTrap(panelRef, menuOpen, () => setMenuOpen(false));

  /**
   * Fecha o menu ao trocar de rota, inclusive quando a navegação vem dos botões
   * de voltar e avançar do navegador. O ajuste é feito durante a renderização,
   * comparando com a localização anterior, para o menu não aparecer aberto por
   * um frame sobre a página nova.
   */
  const currentLocationKey = `${location.pathname}${location.hash}`;
  const [lastLocationKey, setLastLocationKey] = useState(currentLocationKey);
  if (currentLocationKey !== lastLocationKey) {
    setLastLocationKey(currentLocationKey);
    if (menuOpen) setMenuOpen(false);
  }

  /**
   * O header é transparente sobre o hero e fica sólido depois da rolagem. Fora
   * da página inicial não existe hero, então ele já nasce sólido para o texto
   * não ficar sobre o conteúdo.
   */
  const isHome = location.pathname === '/';
  const solid = scrolled || !isHome || menuOpen;

  return (
    <header
      className={cn(
        'ease-brand fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-200',
        solid ? 'bg-brown-900/95 shadow-card backdrop-blur-sm' : 'bg-transparent',
      )}
    >
      <Container>
        <div className="h-18 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="rounded-control flex items-center gap-3 py-1"
            aria-label={`${siteConfig.name} — página inicial`}
          >
            <img
              src={brandAssets.logoMark}
              alt=""
              width={44}
              height={44}
              className="size-11 rounded-full object-cover"
            />
            <span className="font-display text-gold-400 text-xl font-bold sm:text-2xl">
              {siteConfig.name}
            </span>
          </Link>

          <nav aria-label="Navegação principal" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {navigation.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="rounded-control text-cream hover:bg-gold-500 hover:text-brown-900 block px-3 py-2 text-sm font-medium transition-colors duration-200"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="/#agendar"
              className={buttonClasses({
                size: 'sm',
                variant: 'primary',
                className: 'hidden sm:inline-flex',
              })}
            >
              Agendar agora
            </a>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              className="rounded-control text-cream hover:bg-brown-800 inline-flex size-11 items-center justify-center transition-colors lg:hidden"
            >
              {menuOpen ? (
                <X className="size-6" aria-hidden="true" />
              ) : (
                <Menu className="size-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </Container>

      {menuOpen && (
        <div
          ref={panelRef}
          id="menu-mobile"
          className="border-brown-800 bg-brown-900 border-t lg:hidden"
        >
          <Container>
            <nav aria-label="Navegação principal" className="py-4">
              <ul className="flex flex-col">
                {navigation.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-control text-cream hover:bg-brown-800 block px-3 py-3 text-base font-medium transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <a
                href="/#agendar"
                onClick={() => setMenuOpen(false)}
                className="rounded-control bg-gold-500 text-brown-900 hover:bg-gold-400 mt-3 flex h-12 items-center justify-center font-semibold transition-colors"
              >
                Agendar agora
              </a>
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
}
