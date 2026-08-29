import type { PendingOr, ProfessionalSlug } from './site';

/**
 * Catálogo exibido no site público.
 *
 * Os serviços e as durações foram inventariados do agendamento do site atual
 * (`legacy/script.js`), preservando a informação que já estava no ar. Nenhum
 * preço existia lá, então `priceFromCents` está `null` e a interface mostra
 * "A confirmar" em vez de um valor inventado.
 *
 * Este catálogo é apenas a vitrine institucional. O agendamento real consulta os
 * serviços persistidos no banco, cadastrados por cada profissional.
 */

export type ServiceCategory = 'unhas' | 'cabelo' | 'olhar' | 'corpo';

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  unhas: 'Unhas',
  cabelo: 'Cabelo',
  olhar: 'Olhar',
  corpo: 'Corpo',
};

export type ShowcaseService = {
  slug: string;
  name: string;
  category: ServiceCategory;
  description: string;
  /** Duração em minutos, herdada do agendamento do site atual. */
  durationMinutes: PendingOr<number>;
  /** Preço inicial em centavos. Ainda não informado pelas profissionais. */
  priceFromCents: PendingOr<number>;
  professional: ProfessionalSlug;
  image: string;
  imageAlt: string;
};

export const showcaseServices: readonly ShowcaseService[] = [
  {
    slug: 'manicure-pedicure',
    name: 'Manicure e pedicure',
    category: 'unhas',
    description: 'Cuidado completo de mãos e pés, com acabamento impecável e esmaltação.',
    durationMinutes: 60,
    priceFromCents: null,
    professional: 'livia',
    image: '/assets/unha.png',
    imageAlt: 'Unhas com esmaltação e decoração feitas por Lívia',
  },
  {
    slug: 'design-de-sobrancelhas',
    name: 'Design de sobrancelhas',
    category: 'olhar',
    description: 'Desenho personalizado que respeita o formato do seu rosto e valoriza o olhar.',
    durationMinutes: 30,
    priceFromCents: null,
    professional: 'clarisse',
    image: '/assets/cliente-cilios.png',
    imageAlt: 'Sobrancelhas desenhadas por Clarisse',
  },
  {
    slug: 'cilios',
    name: 'Cílios',
    category: 'olhar',
    description: 'Aplicação de cílios com técnica escolhida conforme o efeito que você deseja.',
    durationMinutes: null,
    priceFromCents: null,
    professional: 'clarisse',
    image: '/assets/olhos.png',
    imageAlt: 'Cílios aplicados por Clarisse',
  },
  {
    slug: 'corte-e-escova',
    name: 'Corte e escova',
    category: 'cabelo',
    description: 'Corte moderno e finalização que dão movimento e leveza ao cabelo.',
    durationMinutes: 60,
    priceFromCents: null,
    professional: 'cibele',
    image: '/assets/cabelo-loiro.png',
    imageAlt: 'Cabelo cortado e finalizado por Cibele',
  },
  {
    slug: 'coloracao',
    name: 'Coloração',
    category: 'cabelo',
    description: 'Coloração e tonalização planejadas para o resultado que você tem em mente.',
    durationMinutes: 120,
    priceFromCents: null,
    professional: 'cibele',
    image: '/assets/coloracao.png',
    imageAlt: 'Coloração de cabelo realizada por Cibele',
  },
  {
    slug: 'banho-de-lua',
    name: 'Banho de lua',
    category: 'corpo',
    description: 'Tratamento que clareia os pelos e deixa a pele macia e uniforme.',
    durationMinutes: 90,
    priceFromCents: null,
    professional: 'clarisse',
    image: '/assets/banho-de-lua.png',
    imageAlt: 'Banho de lua realizado por Clarisse',
  },
] as const;

/** Formata a duração de forma legível: 90 -> "1h30". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
}
