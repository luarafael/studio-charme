/**
 * Fonte única de verdade do conteúdo institucional do Studio Charme.
 *
 * Os contatos, perfis e imagens abaixo foram inventariados do site publicado e
 * são REAIS: não altere sem confirmação das profissionais.
 *
 * Preços ainda não informados ficam como `null` e a interface mostra um
 * marcador explícito. Nunca preencha com valores fictícios.
 */

export const PENDING_INFO_LABEL = 'A confirmar';

export type PendingOr<T> = T | null;

export const siteConfig = {
  name: 'Studio Charme',
  tagline: 'Realçando sua beleza',
  shortDescription:
    'Unhas, cabelos, cílios, sobrancelhas e cuidados de beleza em um espaço pensado para você se sentir cuidada nos mínimos detalhes.',
  metaDescription:
    'Studio Charme: unhas, cabelos, cílios, sobrancelhas e cuidados de beleza. Conheça nossos serviços e agende seu atendimento pelo WhatsApp.',

  /** Domínio de produção. Ajustar quando o domínio definitivo for publicado. */
  canonicalUrl: 'https://luarafael.github.io/studio-charme/',

  social: {
    instagramHandle: '_studiocharme',
    instagramUrl: 'https://www.instagram.com/_studiocharme',
  },

  /** WhatsApp geral do studio (o mesmo da Cibele, conforme o rodapé atual). */
  primaryWhatsApp: '5585987963037',

  location: {
    streetAddress: 'Rua Professor Leite Gondim, 1062',
    neighborhood: 'Antônio Bezerra',
    city: 'Fortaleza',
    state: 'CE',
    postalCode: null as PendingOr<string>,
    mapsUrl:
      'https://www.google.com/maps/search/?api=1&query=Rua+Professor+Leite+Gondim,+1062,+Antonio+Bezerra,+Fortaleza,+CE',
    mapsEmbedUrl:
      'https://maps.google.com/maps?q=Rua%20Professor%20Leite%20Gondim%2C%201062%2C%20Antonio%20Bezerra%2C%20Fortaleza%2C%20CE&hl=pt-BR&z=16&output=embed',
  },

  /**
   * Horário de funcionamento do espaço. A agenda real de cada profissional
   * continua vindo do banco (business_hours) na área interna.
   */
  openingHours: [{ label: 'Terça a sábado', hours: '9h às 18h' }],
} as const;

export type ProfessionalSlug = 'livia' | 'cibele' | 'clarisse';

export type PublicProfessional = {
  slug: ProfessionalSlug;
  name: string;
  role: string;
  /** Texto corrigido a partir do site atual, mantendo o conteúdo original. */
  bio: string;
  specialties: string[];
  whatsApp: string;
  instagramHandle: string;
  instagramUrl: string;
  /** Foto de perfil ainda não fornecida; o card usa a imagem de trabalho. */
  photo: PendingOr<string>;
  /** Imagem real de trabalho já usada no site. */
  showcaseImage: string;
  showcaseAlt: string;
};

export const publicProfessionals: readonly PublicProfessional[] = [
  {
    slug: 'livia',
    name: 'Lívia',
    role: 'Designer de unhas',
    bio: 'Designer de unhas especialista em alongamentos, esmaltação em gel e nail art. Criativa e detalhista, ela transforma suas unhas em verdadeiras joias que refletem sua personalidade.',
    specialties: ['Alongamentos', 'Esmaltação em gel', 'Nail art'],
    whatsApp: '5585992029844',
    instagramHandle: 'livianailsdesigner_1',
    instagramUrl: 'https://www.instagram.com/livianailsdesigner_1',
    photo: null,
    showcaseImage: '/assets/unha.png',
    showcaseAlt: 'Unhas decoradas feitas por Lívia',
  },
  {
    slug: 'cibele',
    name: 'Cibele',
    role: 'Cabeleireira',
    bio: 'Cabeleireira dedicada, especialista em cortes modernos, coloração, hidratações e finalizações que realçam a beleza única de cada cliente. Com ela, cada cabelo ganha vida e movimento.',
    specialties: ['Cortes', 'Coloração', 'Hidratação', 'Finalização'],
    whatsApp: '5585987963037',
    instagramHandle: '_studiocharme',
    instagramUrl: 'https://www.instagram.com/_studiocharme',
    photo: null,
    showcaseImage: '/assets/cabelo-loiro.png',
    showcaseAlt: 'Cabelo loiro finalizado por Cibele',
  },
  {
    slug: 'clarisse',
    name: 'Clarisse',
    role: 'Especialista em olhar e depilação',
    // O site atual tinha a frase truncada ("em cílios, sobrancelhas..."); aqui ela está completa.
    bio: 'Clarisse é especialista em cílios, sobrancelhas e depilação, conhecida por seu cuidado minucioso e técnicas que valorizam o olhar e realçam sua expressão natural. Cada detalhe recebe sua atenção especial para resultados perfeitos.',
    specialties: ['Cílios', 'Sobrancelhas', 'Depilação'],
    whatsApp: '5585984560521',
    instagramHandle: 'beauty.clarissemendes',
    instagramUrl: 'https://www.instagram.com/beauty.clarissemendes',
    photo: null,
    showcaseImage: '/assets/olhos.png',
    showcaseAlt: 'Cílios aplicados por Clarisse',
  },
] as const;

export type GalleryItem = {
  src: string;
  alt: string;
  credit: string;
  width: number;
  height: number;
};

/** Galeria de trabalhos reais, com os textos alternativos corrigidos. */
export const galleryItems: readonly GalleryItem[] = [
  {
    src: '/assets/unha.png',
    alt: 'Unhas decoradas por Lívia',
    credit: 'Lívia',
    width: 1024,
    height: 1024,
  },
  {
    src: '/assets/cabelo-loiro.png',
    alt: 'Corte e coloração de cabelo por Cibele',
    credit: 'Cibele',
    width: 1024,
    height: 1024,
  },
  {
    src: '/assets/cliente-cilios.png',
    alt: 'Sobrancelhas desenhadas por Clarisse',
    credit: 'Clarisse',
    width: 1024,
    height: 1024,
  },
  {
    src: '/assets/olhos.png',
    alt: 'Cílios aplicados por Clarisse',
    credit: 'Clarisse',
    width: 1024,
    height: 1024,
  },
  {
    src: '/assets/banho-de-lua.png',
    alt: 'Banho de lua realizado por Clarisse',
    credit: 'Clarisse',
    width: 1024,
    height: 1024,
  },
  {
    src: '/assets/coloracao.png',
    alt: 'Coloração de cabelo por Cibele',
    credit: 'Cibele',
    width: 1024,
    height: 1024,
  },
] as const;

/** Publicações reais do Instagram já referenciadas no site atual. */
export const instagramPosts = [
  {
    url: 'https://www.instagram.com/p/DNJVZ5axSV3/',
    image: '/assets/insta1.jpg',
    alt: 'Publicação do Studio Charme no Instagram',
  },
  {
    url: 'https://www.instagram.com/p/DMJHQhJxQZR/',
    image: '/assets/insta2.jpg',
    alt: 'Publicação do Studio Charme no Instagram',
  },
  {
    url: 'https://www.instagram.com/p/DFNx-uMRTAN/',
    image: '/assets/insta3.jpg',
    alt: 'Publicação do Studio Charme no Instagram',
  },
  {
    url: 'https://www.instagram.com/p/C_gakfcRBy-/',
    image: '/assets/insta4.jpg',
    alt: 'Publicação do Studio Charme no Instagram',
  },
] as const;

export const brandAssets = {
  logoMark: '/assets/SC.png',
  logoFull: '/assets/studiocharme-Photoroom.png',
  logoAlt: '/assets/studiocharme.png',
  favicon: '/assets/favicon.ico',
} as const;

/** Monta o link do WhatsApp com a mensagem já codificada. */
export function buildWhatsAppUrl(phone: string, message?: string): string {
  const base = `https://wa.me/${phone.replace(/\D/g, '')}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function formatFullAddress(): string | null {
  const { streetAddress, neighborhood, city, state } = siteConfig.location;
  if (!streetAddress) return null;
  return [streetAddress, neighborhood, `${city} - ${state}`].filter(Boolean).join(', ');
}
