import { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatCents } from '@studio-charme/contracts';
import {
  SERVICE_CATEGORY_LABELS,
  formatDuration,
  showcaseServices,
  type ServiceCategory,
} from '@/config/services';
import { publicProfessionals } from '@/config/site';
import { Section, SectionHeader } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { PendingInfo } from '@/components/ui/PendingInfo';
import { ResponsiveImage } from '@/components/ui/ResponsiveImage';
import { buttonClasses } from '@/components/ui/styles';

type Filter = 'todos' | ServiceCategory;

const professionalNames = new Map(
  publicProfessionals.map((professional) => [professional.slug, professional.name]),
);

export function ServicesSection() {
  const [filter, setFilter] = useState<Filter>('todos');

  const tabs = useMemo<TabItem<Filter>[]>(() => {
    const categories = Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[];
    return [
      { value: 'todos', label: 'Todos', count: showcaseServices.length },
      ...categories
        .map((category) => ({
          value: category,
          label: SERVICE_CATEGORY_LABELS[category],
          count: showcaseServices.filter((service) => service.category === category).length,
        }))
        // Não exibe aba de categoria vazia.
        .filter((tab) => tab.count > 0),
    ];
  }, []);

  const services = useMemo(
    () =>
      filter === 'todos'
        ? showcaseServices
        : showcaseServices.filter((service) => service.category === filter),
    [filter],
  );

  return (
    <Section id="servicos" tone="muted">
      {/* O site atual trazia "Conheça nosso Serviços", sem a concordância. */}
      <SectionHeader
        eyebrow="O que fazemos"
        title="Conheça nossos serviços"
        description="Escolha o cuidado que você procura e agende com a profissional responsável."
      />

      <Tabs
        items={tabs}
        value={filter}
        onChange={setFilter}
        label="Filtrar serviços por categoria"
        className="mt-10"
      >
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card as="li" key={service.slug} interactive className="flex flex-col overflow-hidden">
              <ResponsiveImage
                src={service.image}
                alt={service.imageAlt}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="h-44 w-full object-cover"
              />

              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-brown-900 text-lg">{service.name}</h3>
                  <span className="text-gold-700 text-xs font-semibold uppercase tracking-wider">
                    {SERVICE_CATEGORY_LABELS[service.category]}
                  </span>
                </div>

                <p className="text-brown-600 flex-1 text-sm">{service.description}</p>

                <dl className="border-brown-50 flex flex-col gap-1.5 border-t pt-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-brown-500">Profissional</dt>
                    <dd className="text-brown-900 font-medium">
                      {professionalNames.get(service.professional)}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-brown-500 flex items-center gap-1">
                      <Clock className="size-3.5" aria-hidden="true" />
                      Duração
                    </dt>
                    <dd className="text-brown-900 font-medium">
                      {service.durationMinutes === null ? (
                        <PendingInfo />
                      ) : (
                        formatDuration(service.durationMinutes)
                      )}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-brown-500">A partir de</dt>
                    <dd className="text-brown-900 font-semibold">
                      {service.priceFromCents === null ? (
                        <PendingInfo />
                      ) : (
                        formatCents(service.priceFromCents)
                      )}
                    </dd>
                  </div>
                </dl>

                <a
                  href="#agendar"
                  className={buttonClasses({ size: 'sm', variant: 'primary', fullWidth: true })}
                >
                  Agendar {service.name.toLowerCase()}
                </a>
              </div>
            </Card>
          ))}
        </ul>
      </Tabs>
    </Section>
  );
}
