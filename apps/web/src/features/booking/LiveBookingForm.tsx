import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { CalendarCheck, MessageCircle } from 'lucide-react';
import {
  createPublicBookingBodySchema,
  maskBrazilianPhone,
  toZonedIsoDate,
  type CreatePublicBookingBody,
  type IsoDate,
  type PublicAvailabilityDto,
  type PublicBookingResponse,
  type PublicCatalogDto,
} from '@studio-charme/contracts';
import { buildWhatsAppUrl, siteConfig } from '@/config/site';
import { liveBookingFollowUpMessage } from '@/lib/whatsappMessages';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { api, ApiClientError, ensureCsrfToken } from '@/lib/api';

type LiveFormInput = {
  clientName: string;
  clientPhone: string;
  professionalSlug: string;
  serviceId: string;
  date: IsoDate;
  time: string;
  notes?: string;
  consent: boolean;
};

type LiveBookingFormProps = {
  catalog: PublicCatalogDto;
};

export function LiveBookingForm({ catalog }: LiveBookingFormProps) {
  const [result, setResult] = useState<PublicBookingResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const today = toZonedIsoDate(new Date());

  const form = useForm<LiveFormInput, unknown, CreatePublicBookingBody>({
    resolver: zodResolver(createPublicBookingBodySchema),
    defaultValues: {
      clientName: '',
      clientPhone: '',
      professionalSlug: '',
      serviceId: '',
      date: today,
      time: '',
      notes: '',
      consent: false,
    },
  });

  const professionalSlug = useWatch({ control: form.control, name: 'professionalSlug' });
  const serviceId = useWatch({ control: form.control, name: 'serviceId' });
  const date = useWatch({ control: form.control, name: 'date' });

  const bookableProfessionals = catalog.professionals.filter(
    (item) => item.hasHours && item.services.length > 0,
  );
  const professional = bookableProfessionals.find((item) => item.slug === professionalSlug);
  const services = professional?.services ?? [];

  const availability = useQuery({
    queryKey: ['public-availability', professionalSlug, serviceId, date],
    queryFn: () =>
      api<PublicAvailabilityDto>('/public/availability', {
        search: { slug: professionalSlug, serviceId, date },
      }),
    enabled: Boolean(professionalSlug && serviceId && date && professional?.hasHours),
  });

  const slots = availability.data?.slots ?? [];

  const whatsappUrl = useMemo(() => {
    if (!result) return null;
    const message = liveBookingFollowUpMessage({
      professionalName: result.professionalName,
      serviceName: result.serviceName,
      date: result.date.split('-').reverse().join('/'),
      time: result.time,
    });
    return buildWhatsAppUrl(result.whatsapp || siteConfig.primaryWhatsApp, message);
  }, [result]);

  if (result && whatsappUrl) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success" title="Solicitação enviada">
          Seu horário está <strong>aguardando confirmação</strong>. Enviar o WhatsApp não confirma
          sozinho o atendimento.
        </Alert>
        <Button
          size="lg"
          fullWidth
          onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          Continuar no WhatsApp
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={form.handleSubmit(async (values) => {
        setFormError(null);
        try {
          await ensureCsrfToken();
          const created = await api<PublicBookingResponse>('/public/bookings', {
            method: 'POST',
            body: values,
          });
          setResult(created);
        } catch (error) {
          if (error instanceof ApiClientError && error.code === 'SCHEDULE_CONFLICT') {
            setFormError('Esse horário acabou de ser ocupado. Escolha outro.');
            await availability.refetch();
            return;
          }
          setFormError(error instanceof ApiClientError ? error.message : 'Não foi possível enviar o pedido.');
        }
      })}
    >
      {formError && <Alert tone="danger">{formError}</Alert>}

      <Field label="Profissional" required error={form.formState.errors.professionalSlug?.message}>
        {(props) => (
          <Select
            {...props}
            {...form.register('professionalSlug', {
              onChange: () => {
                form.setValue('serviceId', '');
                form.setValue('time', '');
              },
            })}
          >
            <option value="">Escolha a profissional</option>
            {bookableProfessionals.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name} — {item.role}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Serviço" required error={form.formState.errors.serviceId?.message}>
        {(props) => (
          <Select {...props} {...form.register('serviceId')} disabled={services.length === 0}>
            <option value="">
              {services.length === 0 ? 'Escolha a profissional primeiro' : 'Escolha o serviço'}
            </option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.durationMinutes} min)
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div>
        <p className="text-brown-900 mb-2 text-sm font-semibold">Data</p>
        <DatePicker
          label="Escolher a data do atendimento"
          value={date}
          minDate={today}
          onChange={(next) => {
            form.setValue('date', next);
            form.setValue('time', '');
          }}
        />
      </div>

      <Field label="Horário" required error={form.formState.errors.time?.message}>
        {(props) => (
          <Select {...props} {...form.register('time')} disabled={slots.length === 0}>
            <option value="">
              {availability.isFetching
                ? 'Consultando agenda…'
                : availability.data?.closed
                  ? 'Sem expediente neste dia'
                  : slots.length === 0
                    ? 'Nenhum horário livre'
                    : 'Escolha o horário'}
            </option>
            {slots.map((slot) => (
              <option key={slot.time} value={slot.time}>
                {slot.time}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:items-start">
        <Field label="Seu nome" required error={form.formState.errors.clientName?.message}>
          {(props) => <Input {...props} autoComplete="name" {...form.register('clientName')} />}
        </Field>
        <Field
          label="Seu WhatsApp"
          required
          hint="Com DDD"
          error={form.formState.errors.clientPhone?.message}
        >
          {(props) => (
            <Input
              {...props}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              {...form.register('clientPhone', {
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                  form.setValue('clientPhone', maskBrazilianPhone(event.target.value), {
                    shouldValidate: false,
                  });
                },
              })}
            />
          )}
        </Field>
      </div>

      <Field label="Observações" error={form.formState.errors.notes?.message}>
        {(props) => <Textarea {...props} rows={3} {...form.register('notes')} />}
      </Field>

      <label className="text-brown-700 flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-4 accent-gold-600" {...form.register('consent')} />
        <span>
          Concordo que meus dados sejam usados para responder e organizar este agendamento, conforme
          a{' '}
          <Link to="/politica-de-privacidade" className="text-gold-700 font-medium underline underline-offset-2">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
      {form.formState.errors.consent && (
        <p className="text-danger-700 text-sm" role="alert">
          {form.formState.errors.consent.message}
        </p>
      )}

      <Button type="submit" size="lg" fullWidth isLoading={form.formState.isSubmitting}>
        Enviar solicitação
      </Button>
      <p className="text-brown-500 flex items-start gap-2 text-xs">
        <CalendarCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        O horário fica pendente até a profissional confirmar. Os nomes de outras clientes não
        aparecem nesta lista.
      </p>
    </form>
  );
}
