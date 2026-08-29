import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Link } from 'react-router';
import {
  brazilianPhoneSchema,
  formatCents,
  isoDateSchema,
  maskBrazilianPhone,
  occupiesSchedule,
  timeOfDaySchema,
  uuidSchema,
  toZonedIsoDate,
  type AppointmentDto,
  type ClientDto,
  type IsoDate,
  type ServiceDto,
  type TimeOfDay,
} from '@studio-charme/contracts';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { formatTime } from '@/features/agenda/format';
import { api, ApiClientError } from '@/lib/api';

type AppointmentComposerProps = {
  open: boolean;
  onClose: () => void;
  /** Dia sugerido ao abrir; a profissional pode trocar no calendário do formulário. */
  date: IsoDate;
  onSaved?: (date: IsoDate) => void;
};

/**
 * Formulário próprio, sem `.omit()` no contrato.
 * No Zod 4, omitir campos de um objeto que já tem `.refine()` (como a data ISO)
 * quebra a página inteira ao carregar o módulo.
 */
const composerSchema = z
  .object({
    date: isoDateSchema,
    time: z
      .string()
      .transform((value) => value.slice(0, 5))
      .pipe(timeOfDaySchema),
    serviceIds: z.array(uuidSchema).min(1, 'Selecione ao menos um serviço.'),
    notes: z.string().trim().max(2000).optional(),
    clientMode: z.enum(['existing', 'new']),
    clientId: z.string().optional(),
    newName: z.string().optional(),
    newPhone: z.string().optional(),
    consentGiven: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.clientMode === 'existing') {
      if (!data.clientId) {
        ctx.addIssue({ code: 'custom', path: ['clientId'], message: 'Selecione a cliente.' });
      }
      return;
    }
    if (!data.newName || data.newName.trim().length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['newName'],
        message: 'Informe o nome da cliente.',
      });
    }
    const phone = brazilianPhoneSchema.safeParse(data.newPhone ?? '');
    if (!phone.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['newPhone'],
        message: 'Informe um telefone brasileiro válido com DDD.',
      });
    }
    if (!data.consentGiven) {
      ctx.addIssue({
        code: 'custom',
        path: ['consentGiven'],
        message: 'É preciso o consentimento da cliente para guardar o contato.',
      });
    }
  });

type ComposerInput = z.infer<typeof composerSchema>;

const EMPTY_SERVICE_IDS: string[] = [];

export function AppointmentComposer({ open, onClose, date, onSaved }: AppointmentComposerProps) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [phoneMask, setPhoneMask] = useState('');
  const today = toZonedIsoDate(new Date());
  const initialDate = date < today ? today : date;

  const clients = useQuery({
    queryKey: ['clients'],
    queryFn: () => api<{ items: ClientDto[] }>('/clients'),
    enabled: open,
  });
  const services = useQuery({
    queryKey: ['services'],
    queryFn: () => api<{ items: ServiceDto[] }>('/services'),
    enabled: open,
  });
  const form = useForm<ComposerInput, unknown, ComposerInput>({
    resolver: zodResolver(composerSchema),
    defaultValues: {
      clientMode: 'existing',
      date: initialDate,
      time: '09:00',
      serviceIds: [],
      notes: '',
      consentGiven: false,
    },
  });

  const selectedDate = useWatch({ control: form.control, name: 'date' }) ?? initialDate;
  const selectedServiceIds =
    useWatch({ control: form.control, name: 'serviceIds' }) ?? EMPTY_SERVICE_IDS;
  const clientMode = useWatch({ control: form.control, name: 'clientMode' });

  const dayAppointments = useQuery({
    queryKey: ['appointments', selectedDate],
    queryFn: () =>
      api<{ items: AppointmentDto[] }>('/appointments', {
        search: { from: selectedDate, to: selectedDate },
      }),
    enabled: open,
  });

  const selectedServices = useMemo(
    () => (services.data?.items ?? []).filter((item) => selectedServiceIds.includes(item.id)),
    [services.data?.items, selectedServiceIds],
  );

  const durationMinutes = selectedServices.reduce((sum, item) => sum + item.durationMinutes, 0);
  const bufferAfterMinutes = selectedServices.length
    ? Math.max(...selectedServices.map((item) => item.bufferAfterMinutes))
    : 0;
  const totalPriceCents = selectedServices.reduce((sum, item) => sum + item.priceCents, 0);

  const busyThatDay = useMemo(
    () =>
      (dayAppointments.data?.items ?? [])
        .filter((item) => occupiesSchedule(item.status))
        .map((item) => `${formatTime(item.startsAt)} ${item.client.name}`),
    [dayAppointments.data?.items],
  );

  const createClient = useMutation({
    mutationFn: (body: { name: string; phone: string; consentGiven: true }) =>
      api<ClientDto>('/clients', { method: 'POST', body }),
  });

  const createAppointment = useMutation({
    mutationFn: (body: { clientId: string; serviceIds: string[]; date: IsoDate; time: TimeOfDay; notes?: string }) =>
      api<AppointmentDto>('/appointments', {
        method: 'POST',
        body: { ...body, source: 'INTERNAL' },
      }),
  });

  async function onSubmit(values: ComposerInput): Promise<void> {
    setFormError(null);
    try {
      let clientId = values.clientId;
      if (values.clientMode === 'new') {
        const phone = brazilianPhoneSchema.parse(values.newPhone);
        const created = await createClient.mutateAsync({
          name: values.newName!.trim(),
          phone,
          consentGiven: true,
        });
        clientId = created.id;
        await queryClient.invalidateQueries({ queryKey: ['clients'] });
      }

      await createAppointment.mutateAsync({
        clientId: clientId!,
        serviceIds: values.serviceIds,
        date: values.date,
        time: values.time,
        notes: values.notes,
      });
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      form.reset();
      setPhoneMask('');
      onSaved?.(values.date);
      onClose();
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'SCHEDULE_CONFLICT') {
        setFormError('Já existe um atendimento neste horário. Escolha outro.');
        return;
      }
      if (error instanceof ApiClientError && error.code === 'DUPLICATE_RESOURCE') {
        setFormError('Você já tem uma cliente com este WhatsApp.');
        return;
      }
      setFormError(error instanceof ApiClientError ? error.message : 'Não foi possível salvar o atendimento.');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo atendimento"
      description="Pode ser qualquer dia e qualquer horário. Só não dá para marcar em cima de outro atendimento seu."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="appointment-composer"
            isLoading={form.formState.isSubmitting}
          >
            Salvar na agenda
          </Button>
        </>
      }
    >
      {(clients.isError || services.isError) && (
        <Alert tone="danger" className="mb-4">
          Não foi possível carregar clientes ou serviços. Recarregue e tente de novo.
        </Alert>
      )}

      {formError && (
        <Alert tone="danger" className="mb-4">
          {formError}
        </Alert>
      )}

      {(services.data?.items.length ?? 0) === 0 && !services.isLoading ? (
        <Alert tone="warning" title="Cadastre um serviço antes">
          Sem serviço com duração e valor, não dá para marcar um horário.{' '}
          <Link to="/app/clientes" className="text-accent-text underline-offset-2 hover:underline">
            Cadastre o primeiro serviço
          </Link>
          .
        </Alert>
      ) : (
        <form
          id="appointment-composer"
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Field label="Cliente" required>
            {(props) => (
              <Select
                {...props}
                value={clientMode}
                onChange={(event) =>
                  form.setValue('clientMode', event.target.value as 'existing' | 'new')
                }
              >
                <option value="existing">Cliente já cadastrada</option>
                <option value="new">Nova cliente</option>
              </Select>
            )}
          </Field>

          {clientMode === 'existing' ? (
            <Field label="Quem será atendida" required error={form.formState.errors.clientId?.message}>
              {(props) => (
                <Select {...props} {...form.register('clientId')}>
                  <option value="">Selecione</option>
                  {(clients.data?.items ?? []).map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : (
            <>
              <Field label="Nome" required error={form.formState.errors.newName?.message}>
                {(props) => <Input {...props} {...form.register('newName')} autoComplete="name" />}
              </Field>
              <Field
                label="WhatsApp"
                required
                hint="Com DDD. O número é guardado só na sua lista."
                error={form.formState.errors.newPhone?.message}
              >
                {(props) => (
                  <Input
                    {...props}
                    inputMode="tel"
                    autoComplete="tel"
                    value={phoneMask}
                    onChange={(event) => {
                      const next = maskBrazilianPhone(event.target.value);
                      setPhoneMask(next);
                      form.setValue('newPhone', next, { shouldValidate: true });
                    }}
                  />
                )}
              </Field>
              <label className="text-brown-700 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-gold-600"
                  {...form.register('consentGiven')}
                />
                A cliente autorizou guardar o contato e receber avisos desta profissional.
              </label>
              {form.formState.errors.consentGiven && (
                <p className="text-danger-700 text-sm">{form.formState.errors.consentGiven.message}</p>
              )}
            </>
          )}

          <fieldset>
            <legend className="text-brown-900 mb-2 text-sm font-semibold">Serviços</legend>
            <ul className="flex flex-col gap-2">
              {(services.data?.items ?? []).map((service) => {
                const checked = selectedServiceIds.includes(service.id);
                return (
                  <li key={service.id}>
                    <div className="rounded-control border-brown-100 flex items-start gap-3 border bg-white px-3 py-2.5">
                      <input
                        id={`service-${service.id}`}
                        type="checkbox"
                        className="mt-1 size-4 accent-gold-600"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? selectedServiceIds.filter((id) => id !== service.id)
                            : [...selectedServiceIds, service.id];
                          form.setValue('serviceIds', next, { shouldValidate: true });
                        }}
                      />
                      <label htmlFor={`service-${service.id}`} className="cursor-pointer">
                        {service.name}
                        <span className="text-brown-500 mt-0.5 block text-xs">
                          {service.durationMinutes} min · {formatCents(service.priceCents)}
                        </span>
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
            {form.formState.errors.serviceIds && (
              <p className="text-danger-700 mt-1 text-sm">{form.formState.errors.serviceIds.message}</p>
            )}
          </fieldset>

          {durationMinutes > 0 && (
            <p className="text-brown-600 text-sm">
              Duração prevista: {durationMinutes} min
              {bufferAfterMinutes > 0 ? ` + ${bufferAfterMinutes} min de intervalo` : ''}. Total{' '}
              {formatCents(totalPriceCents)}.
            </p>
          )}

          <div>
            <p className="text-brown-900 mb-2 text-sm font-semibold">Dia do atendimento</p>
            <DatePicker
              label="Escolher o dia do atendimento"
              value={selectedDate}
              minDate={today}
              onChange={(next) => {
                form.setValue('date', next, { shouldValidate: true, shouldDirty: true });
              }}
            />
          </div>

          <Field
            label="Horário"
            required
            error={form.formState.errors.time?.message}
            hint={
              busyThatDay.length > 0
                ? `Já neste dia: ${busyThatDay.join(', ')}.`
                : 'Qualquer horário serve, inclusive fora da jornada publicada no site.'
            }
          >
            {(props) => <Input {...props} type="time" {...form.register('time')} />}
          </Field>

          <Field label="Observações" error={form.formState.errors.notes?.message}>
            {(props) => <Textarea {...props} {...form.register('notes')} />}
          </Field>
        </form>
      )}
    </Modal>
  );
}
