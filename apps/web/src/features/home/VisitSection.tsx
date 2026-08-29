import { Clock, MapPin, Navigation } from 'lucide-react';
import { formatFullAddress, siteConfig } from '@/config/site';
import { Section, SectionHeader } from '@/components/layout/Section';
import { Card, CardBody } from '@/components/ui/Card';
import { PendingInfo } from '@/components/ui/PendingInfo';
import { buttonClasses } from '@/components/ui/styles';

/** Endereço, horário e mapa do studio. */
export function VisitSection() {
  const address = formatFullAddress();
  const { openingHours, location } = siteConfig;

  return (
    <Section id="visite" tone="muted">
      <SectionHeader
        eyebrow="Onde estamos"
        title="Venha nos visitar"
        description="Estamos em Fortaleza, no Ceará, na Rua Professor Leite Gondim, 1062, Antônio Bezerra."
      />

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Card>
          <CardBody className="flex flex-col gap-4">
            <span className="rounded-control bg-gold-100 text-gold-800 inline-flex size-11 items-center justify-center">
              <MapPin className="size-5" aria-hidden="true" />
            </span>

            <div>
              <h3 className="text-brown-900 text-lg">Endereço</h3>
              {address ? (
                <address className="text-brown-600 mt-2 text-sm not-italic">{address}</address>
              ) : (
                <div className="mt-2 flex flex-col items-start gap-2">
                  <PendingInfo label="Endereço a confirmar" />
                  <p className="text-brown-600 text-sm">
                    Atendemos em {location.city} – {location.state}. Fale com a profissional pelo
                    WhatsApp para receber o endereço completo.
                  </p>
                </div>
              )}
            </div>

            {location.mapsUrl && (
              <a
                href={location.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ size: 'sm', variant: 'outline' })}
              >
                <Navigation className="size-4" aria-hidden="true" />
                Abrir no Google Maps
              </a>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <span className="rounded-control bg-gold-100 text-gold-800 inline-flex size-11 items-center justify-center">
              <Clock className="size-5" aria-hidden="true" />
            </span>

            <div>
              <h3 className="text-brown-900 text-lg">Horário de funcionamento</h3>

              {openingHours ? (
                <>
                  <dl className="mt-3 flex flex-col gap-2 text-sm">
                    {openingHours.map((entry) => (
                      <div
                        key={entry.label}
                        className="border-brown-50 flex justify-between gap-4 border-b pb-2 last:border-0"
                      >
                        <dt className="text-brown-600">{entry.label}</dt>
                        <dd className="text-brown-900 font-medium">{entry.hours}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-brown-600 mt-3 text-sm">
                    Para atendimento fora deste horário, consulte a profissional.
                  </p>
                </>
              ) : (
                <div className="mt-2 flex flex-col items-start gap-2">
                  <PendingInfo label="Horários a confirmar" />
                  <p className="text-brown-600 text-sm">
                    Cada profissional tem a sua própria agenda. Os horários disponíveis aparecem ao
                    escolher o serviço no agendamento.
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {location.mapsEmbedUrl && (
        <div className="border-brown-100 mt-6 overflow-hidden rounded-card border bg-white">
          <iframe
            title="Mapa do Studio Charme na Rua Professor Leite Gondim, 1062, Antônio Bezerra, Fortaleza"
            src={location.mapsEmbedUrl}
            className="h-72 w-full border-0 md:h-96"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}
    </Section>
  );
}
