import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import HomePage from './HomePage';

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('/api/v1/public/catalog')) {
        return new Response(JSON.stringify({ professionals: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'not mocked' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HomePage — correções de conteúdo exigidas', () => {
  it('escreve "Início" com acento no menu', () => {
    renderHome();
    const nav = screen.getAllByRole('navigation', { name: 'Navegação principal' })[0]!;
    expect(within(nav).getByRole('link', { name: 'Início' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Inicio' })).not.toBeInTheDocument();
  });

  it('oferece o botão Entrar para a equipe acessar a conta', () => {
    renderHome();
    const loginLinks = screen.getAllByRole('link', { name: 'Entrar' });
    expect(loginLinks.length).toBeGreaterThan(0);
    for (const link of loginLinks) {
      expect(link).toHaveAttribute('href', '/entrar');
    }
  });

  it('usa "Conheça nossos serviços" com a concordância correta', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: 'Conheça nossos serviços' })).toBeInTheDocument();
    expect(screen.queryByText('Conheça nosso Serviços')).not.toBeInTheDocument();
  });

  it('escreve "Cílios" com acento', () => {
    renderHome();
    // O site anterior tinha "Cilios" no texto alternativo da galeria.
    expect(screen.queryByText(/\bCilios\b/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cílios' })).toBeInTheDocument();
  });

  it('apresenta a descrição completa da Clarisse', () => {
    renderHome();
    // No site atual a frase começava truncada: "em cílios, sobrancelhas...".
    expect(
      screen.getByText(/^Clarisse é especialista em cílios, sobrancelhas e depilação/),
    ).toBeInTheDocument();
  });

  it('gera o ano do rodapé automaticamente', () => {
    renderHome();
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${year} Studio Charme`))).toBeInTheDocument();
  });

  it('padroniza a capitalização dos nomes das profissionais', () => {
    renderHome();
    for (const name of ['Lívia', 'Cibele', 'Clarisse']) {
      expect(screen.getAllByRole('heading', { name }).length).toBeGreaterThan(0);
    }
  });
});

describe('HomePage — estrutura e acessibilidade', () => {
  it('tem um único h1', () => {
    renderHome();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('oferece link para pular direto ao conteúdo', () => {
    renderHome();
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute(
      'href',
      '#conteudo',
    );
  });

  it('define o título e a descrição da página', () => {
    renderHome();
    expect(document.title).toContain('Studio Charme');
    expect(
      document.head.querySelector('meta[name="description"]')?.getAttribute('content'),
    ).toContain('unhas, cabelos, cílios');
  });

  it('protege todos os links externos com rel="noopener noreferrer"', () => {
    renderHome();

    const externalLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('target') === '_blank');

    expect(externalLinks.length).toBeGreaterThan(0);
    for (const link of externalLinks) {
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('define largura e altura em todas as imagens, evitando salto de layout', () => {
    renderHome();

    for (const image of screen.getAllByRole('img')) {
      expect(image).toHaveAttribute('width');
      expect(image).toHaveAttribute('height');
    }
  });

  it('carrega as imagens abaixo da dobra com lazy loading', () => {
    renderHome();

    const gallery = screen
      .getByRole('heading', { name: 'Trabalhos feitos no studio' })
      .closest('section');
    const images = gallery?.querySelectorAll('img') ?? [];

    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image).toHaveAttribute('loading', 'lazy');
    }
  });
});

describe('HomePage — dados reais preservados', () => {
  it('mantém os WhatsApps reais das três profissionais', () => {
    renderHome();

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '')
      .join(' ');

    expect(hrefs).toContain('5585992029844');
    expect(hrefs).toContain('5585987963037');
    expect(hrefs).toContain('5585984560521');
  });

  it('mantém os perfis reais do Instagram', () => {
    renderHome();

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '')
      .join(' ');

    expect(hrefs).toContain('instagram.com/_studiocharme');
    expect(hrefs).toContain('instagram.com/livianailsdesigner_1');
    expect(hrefs).toContain('instagram.com/beauty.clarissemendes');
  });

  it('reutiliza a logo e as imagens originais do site', () => {
    renderHome();

    const sources = screen
      .getAllByRole('img')
      .map((image) => image.getAttribute('src') ?? '')
      .join(' ');

    expect(sources).toContain('/assets/SC.png');
    expect(sources).toContain('/assets/unha.png');
    expect(sources).toContain('/assets/cabelo-loiro.png');
    expect(sources).toContain('/assets/olhos.png');
  });

  it('não exibe preço inventado enquanto o valor real não for informado', () => {
    renderHome();
    // Marcadores explícitos em vez de valores fictícios.
    expect(screen.getAllByText('A confirmar').length).toBeGreaterThan(0);
  });

  it('mostra o endereço, o horário e o mapa na seção de visita', () => {
    renderHome();
    expect(
      screen.getByText(/Estamos em Fortaleza, no Ceará, na Rua Professor Leite Gondim, 1062/),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Endereço' })).toBeInTheDocument();
    expect(screen.getByText('Terça a sábado')).toBeInTheDocument();
    expect(screen.getByText('9h às 18h')).toBeInTheDocument();
    expect(
      screen.getByText(/Para atendimento fora deste horário, consulte a profissional/),
    ).toBeInTheDocument();
    expect(
      screen.getByTitle(/Mapa do Studio Charme na Rua Professor Leite Gondim/),
    ).toBeInTheDocument();
  });
});
