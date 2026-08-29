import { Instagram, MessageCircle } from 'lucide-react';
import { formatBrazilianPhone } from '@studio-charme/contracts';
import { buildWhatsAppUrl, publicProfessionals, siteConfig } from '@/config/site';
import { Section, SectionHeader } from '@/components/layout/Section';
import { Card, CardBody } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/styles';

export function ContactSection() {
  return (
    <Section id="contato">
      <SectionHeader
        eyebrow="Contato"
        title="Fale direto com a profissional"
        description="Cada uma cuida da própria agenda, então o contato direto é o caminho mais rápido."
      />

      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {publicProfessionals.map((professional) => (
          <Card as="li" key={professional.slug} interactive>
            <CardBody className="flex flex-col items-center gap-4 text-center">
              <div>
                <h3 className="font-display text-brown-900 text-xl">{professional.name}</h3>
                <p className="text-gold-700 text-sm">{professional.role}</p>
              </div>

              <p className="text-brown-600 text-sm">
                {formatBrazilianPhone(professional.whatsApp)}
              </p>

              <div className="flex gap-2">
                <a
                  href={buildWhatsAppUrl(
                    professional.whatsApp,
                    `Olá, ${professional.name}! Vim pelo site do ${siteConfig.name}.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`WhatsApp de ${professional.name}`}
                  className={buttonClasses({ size: 'sm', variant: 'secondary', className: 'px-3' })}
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  WhatsApp
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
            </CardBody>
          </Card>
        ))}
      </ul>
    </Section>
  );
}
