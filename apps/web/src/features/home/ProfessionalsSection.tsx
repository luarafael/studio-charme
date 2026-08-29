import { Instagram, MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl, publicProfessionals, siteConfig } from '@/config/site';
import { Section, SectionHeader } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/styles';
import { ResponsiveImage } from '@/components/ui/ResponsiveImage';

export function ProfessionalsSection() {
  return (
    <Section id="profissionais">
      <SectionHeader
        eyebrow="Nossa equipe"
        title="Quem vai cuidar de você"
        description="Cada profissional é especialista na sua área e atende com agenda própria."
      />

      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {publicProfessionals.map((professional) => (
          <Card
            as="li"
            key={professional.slug}
            interactive
            className="flex flex-col overflow-hidden"
          >
            <ResponsiveImage
              src={professional.photo ?? professional.showcaseImage}
              alt={
                professional.photo
                  ? `Foto de ${professional.name}`
                  : `Trabalho de ${professional.name}: ${professional.showcaseAlt}`
              }
              sizes="(min-width: 768px) 33vw, 100vw"
              // object-position ligeiramente acima do centro evita cortar o
              // ponto de interesse das fotos de trabalho.
              className="h-52 w-full object-cover object-[center_35%]"
            />

            <div className="flex flex-1 flex-col gap-4 p-6">
              <div>
                <h3 className="font-display text-brown-900 text-xl">{professional.name}</h3>
                <p className="text-gold-700 text-sm font-medium">{professional.role}</p>
              </div>

              <p className="text-brown-600 flex-1 text-sm">{professional.bio}</p>

              <ul className="flex flex-wrap gap-1.5">
                {professional.specialties.map((specialty) => (
                  <li key={specialty}>
                    <Badge tone="gold">{specialty}</Badge>
                  </li>
                ))}
              </ul>

              <div className="border-brown-50 flex flex-wrap gap-2 border-t pt-4">
                <a
                  href={buildWhatsAppUrl(
                    professional.whatsApp,
                    `Olá, ${professional.name}! Vim pelo site do ${siteConfig.name} e gostaria de agendar um horário.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses({ size: 'sm', variant: 'secondary' })}
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  Agendar com {professional.name}
                </a>

                <a
                  href={professional.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Instagram de ${professional.name}: @${professional.instagramHandle}`}
                  className={buttonClasses({ size: 'sm', variant: 'outline', className: 'px-3' })}
                >
                  <Instagram className="size-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </Card>
        ))}
      </ul>
    </Section>
  );
}
