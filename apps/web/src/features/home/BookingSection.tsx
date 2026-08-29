import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router';
import { CalendarCheck, MessageCircle } from 'lucide-react';
import {
  brazilianPhoneSchema,
  formatBrazilianPhone,
  maskBrazilianPhone,
} from '@studio-charme/contracts';
import { buildWhatsAppUrl, publicProfessionals, siteConfig } from '@/config/site';
import { bookingRequestMessage } from '@/lib/whatsappMessages';
import { showcaseServices } from '@/config/services';
import { Section, SectionHeader } from '@/components/layout/Section';
import { Card, CardBody } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { api, ApiClientError, ensureCsrfToken } from '@/lib/api';
import { LiveBookingForm } from '@/features/booking/LiveBookingForm';
import type { PublicCatalogDto, PublicLeadResponse } from '@studio-charme/contracts';

const NO_PREFERENCE = 'sem-preferencia';

const bookingRequestSchema = z.object({
  clientName: z.string().trim().min(2, 'Informe seu nome.').max(120),
  clientPhone: brazilianPhoneSchema,
  serviceSlug: z.string().min(1, 'Escolha um serviço.'),
  professionalSlug: z.string().min(1, 'Escolha uma profissional.'),
  notes: z.string().trim().max(500, 'A observação pode ter no máximo 500 caracteres.').optional(),
  // `refine` em vez de `z.literal(true)` para o campo continuar sendo booleano
  // na entrada do formulário, já que ele começa desmarcado.
  consent: z
    .boolean()
    .refine((value) => value, 'É necessário concordar com o uso dos seus dados para o contato.'),
});

type BookingRequestForm = z.input<typeof bookingRequestSchema>;
type BookingRequestData = z.output<typeof bookingRequestSchema>;

/**
 * Ponto de entrada do agendamento.
 *
 * Nesta etapa o pedido segue pelo WhatsApp quando a profissional ainda não
 * publicou jornada e serviços. Com agenda no banco, a cliente escolhe um
 * horário real; o status fica pendente até a confirmação.
 */
export function BookingSection() {
  const [catalog, setCatalog] = useState<PublicCatalogDto | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api<PublicCatalogDto>('/public/catalog')
      .then((data) => {
        const live = data.professionals.some(
          (item) => item.hasHours && item.services.length > 0,
        );
        if (!cancelled && live) setCatalog(data);
      })
      .catch(() => {
        /* Sem catálogo ao vivo, o pedido segue só pelo WhatsApp. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const liveAgenda = catalog !== null;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BookingRequestForm, unknown, BookingRequestData>({
    resolver: zodResolver(bookingRequestSchema),
    defaultValues: {
      clientName: '',
      clientPhone: '',
      serviceSlug: '',
      professionalSlug: '',
      notes: '',
      consent: false,
    },
  });

  const selectedService = useWatch({ control, name: 'serviceSlug' });

  // Ao escolher um serviço, sugere a profissional que o realiza.
  const compatibleProfessionals = publicProfessionals.filter((professional) => {
    if (!selectedService) return true;
    const service = showcaseServices.find((item) => item.slug === selectedService);
    return !service || service.professional === professional.slug;
  });

  // O resolver já validou e normalizou os dados (o telefone chega em E.164).
  const onSubmit = async (parsed: BookingRequestData): Promise<void> => {
    setFormError(null);
    const service = showcaseServices.find((item) => item.slug === parsed.serviceSlug);

    const professional =
      parsed.professionalSlug === NO_PREFERENCE
        ? null
        : publicProfessionals.find((item) => item.slug === parsed.professionalSlug);

    const destinationProfessional =
      professional ??
      publicProfessionals.find((item) => item.whatsApp === siteConfig.primaryWhatsApp) ??
      publicProfessionals[0];
    if (!destinationProfessional) {
      setFormError('Não foi possível identificar a profissional.');
      return;
    }

    try {
      await ensureCsrfToken();
      await api<PublicLeadResponse>('/public/leads', {
        method: 'POST',
        body: {
          professionalSlug: destinationProfessional.slug,
          clientName: parsed.clientName,
          clientPhone: parsed.clientPhone,
          notes: parsed.notes,
          serviceName: service?.name,
          consent: true,
        },
      });
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : 'Não foi possível guardar seu contato. Tente de novo.',
      );
      return;
    }

    const message = bookingRequestMessage({
      clientName: parsed.clientName,
      clientPhone: formatBrazilianPhone(parsed.clientPhone),
      serviceName: service?.name,
      professionalName: professional?.name,
      notes: parsed.notes,
    });

    // Sem profissional escolhida, a mensagem vai para o contato geral do studio.
    const destination = professional?.whatsApp ?? siteConfig.primaryWhatsApp;
    window.open(buildWhatsAppUrl(destination, message), '_blank', 'noopener,noreferrer');
  };

  return (
    <Section id="agendar">
      <SectionHeader
        eyebrow="Agendamento"
        title="Agende seu atendimento"
        description="Preencha seus dados e envie o pedido pela profissional escolhida."
      />

      <div className="mx-auto mt-12 max-w-2xl">
        <Card>
          <CardBody>
            <Alert tone="info" title="Como funciona">
              {liveAgenda ? (
                <>
                  Os horários abaixo vêm da agenda real da profissional. O envio é uma{' '}
                  <strong>solicitação</strong>, não uma confirmação.
                </>
              ) : (
                <>
                  O envio da mensagem é uma <strong>solicitação</strong> de horário, não uma
                  confirmação. A profissional responde com os horários livres e confirma o
                  agendamento com você.
                </>
              )}
            </Alert>

            {liveAgenda && catalog ? (
              <div className="mt-6">
                <LiveBookingForm catalog={catalog} />
              </div>
            ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-5" noValidate>
              {formError && <Alert tone="danger">{formError}</Alert>}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:items-start">
                <Field label="Seu nome" required error={errors.clientName?.message}>
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      {...register('clientName')}
                      autoComplete="name"
                      placeholder="Como podemos te chamar?"
                    />
                  )}
                </Field>

                <Field
                  label="Seu WhatsApp"
                  required
                  hint="Com DDD"
                  error={errors.clientPhone?.message}
                >
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      {...register('clientPhone', {
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                          // Máscara aplicada durante a digitação; a normalização
                          // para o formato E.164 acontece na validação.
                          setValue('clientPhone', maskBrazilianPhone(event.target.value), {
                            shouldValidate: false,
                          });
                        },
                      })}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="(85) 99999-9999"
                    />
                  )}
                </Field>
              </div>

              <Field label="Serviço" required error={errors.serviceSlug?.message}>
                {(fieldProps) => (
                  <Select {...fieldProps} {...register('serviceSlug')} defaultValue="">
                    <option value="" disabled>
                      Escolha o serviço
                    </option>
                    {showcaseServices.map((service) => (
                      <option key={service.slug} value={service.slug}>
                        {service.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="Profissional" required error={errors.professionalSlug?.message}>
                {(fieldProps) => (
                  <Select {...fieldProps} {...register('professionalSlug')} defaultValue="">
                    <option value="" disabled>
                      Escolha a profissional
                    </option>
                    {compatibleProfessionals.map((professional) => (
                      <option key={professional.slug} value={professional.slug}>
                        {professional.name} — {professional.role}
                      </option>
                    ))}
                    <option value={NO_PREFERENCE}>Não tenho preferência</option>
                  </Select>
                )}
              </Field>

              <Field
                label="Observações"
                hint="Opcional. Conte se tem preferência de dia, horário ou algum detalhe."
                error={errors.notes?.message}
              >
                {(fieldProps) => (
                  <Textarea
                    {...fieldProps}
                    {...register('notes')}
                    rows={3}
                    placeholder="Ex.: prefiro atendimento à tarde."
                  />
                )}
              </Field>

              <div className="flex flex-col gap-2">
                <label className="text-brown-700 flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    {...register('consent')}
                    aria-invalid={errors.consent ? true : undefined}
                    className="border-brown-300 text-gold-600 focus:ring-gold-500/35 mt-0.5 size-4 shrink-0 rounded focus:ring-2"
                  />
                  <span>
                    Concordo que meus dados sejam usados para responder e organizar este
                    agendamento, conforme a{' '}
                    <Link
                      to="/politica-de-privacidade"
                      className="text-gold-700 font-medium underline underline-offset-2"
                    >
                      Política de Privacidade
                    </Link>
                    .
                  </span>
                </label>
                {errors.consent && (
                  <p className="text-danger-700 text-sm" role="alert">
                    {errors.consent.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
                loadingLabel="Preparando sua solicitação"
              >
                <MessageCircle className="size-5" aria-hidden="true" />
                Enviar solicitação pelo WhatsApp
              </Button>

              <p className="text-brown-500 flex items-start gap-2 text-xs">
                <CalendarCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Em breve será possível escolher data e horário direto no site, com a agenda real de
                cada profissional.
              </p>
            </form>
            )}
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}
