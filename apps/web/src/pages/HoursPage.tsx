import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  WEEKDAY_LABELS,
  minutesToTime,
  timeToMinutes,
  toZonedIsoDate,
  type AvailabilityOverrideDto,
  type BusinessHourDto,
  type IsoDate,
} from '@studio-charme/contracts';
import { siteConfig } from '@/config/site';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useToast } from '@/hooks/useToast';
import { api, ApiClientError } from '@/lib/api';

type DayDraft = {
  enabled: boolean;
  start: string;
  end: string;
};

function hoursToDraft(items: BusinessHourDto[]): DayDraft[] {
  return WEEKDAY_LABELS.map((_, weekday) => {
    const row = items.find((item) => item.weekday === weekday);
    return {
      enabled: Boolean(row),
      start: row ? minutesToTime(row.startMinute) : '08:00',
      end: row ? minutesToTime(row.endMinute) : '18:00',
    };
  });
}

export default function HoursPage() {
  useDocumentMeta({
    title: `Horários | ${siteConfig.name}`,
    noIndex: true,
  });

  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<DayDraft[] | null>(null);
  const [offDate, setOffDate] = useState<IsoDate>(toZonedIsoDate(new Date()));
  const [offReason, setOffReason] = useState('');

  const hours = useQuery({
    queryKey: ['availability-hours'],
    queryFn: () => api<{ items: BusinessHourDto[] }>('/availability/hours'),
  });
  const overrides = useQuery({
    queryKey: ['availability-overrides'],
    queryFn: () => api<{ items: AvailabilityOverrideDto[] }>('/availability/overrides'),
  });

  const days = draft ?? (hours.data ? hoursToDraft(hours.data.items) : null);

  const saveHours = useMutation({
    mutationFn: (body: { hours: BusinessHourDto[] }) =>
      api<{ items: BusinessHourDto[] }>('/availability/hours', { method: 'PUT', body }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['availability-hours'] });
      setDraft(hoursToDraft(data.items));
      showToast({ tone: 'success', title: 'Jornada salva' });
    },
  });

  const createOff = useMutation({
    mutationFn: () =>
      api<AvailabilityOverrideDto>('/availability/overrides', {
        method: 'POST',
        body: { type: 'TIME_OFF', date: offDate, reason: offReason || undefined },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['availability-overrides'] });
      setOffReason('');
      showToast({ tone: 'success', title: 'Folga registrada' });
    },
  });

  const payload = useMemo(() => {
    if (!days) return [];
    return days.flatMap((day, weekday) =>
      day.enabled
        ? [{ weekday, startMinute: timeToMinutes(day.start), endMinute: timeToMinutes(day.end) }]
        : [],
    );
  }, [days]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-gold-700 text-sm font-semibold tracking-wide uppercase">Sua jornada</p>
        <h1 className="text-display-sm text-brown-900 mt-1">Horários</h1>
        <p className="text-brown-600 mt-2 text-sm">
          Só o que você salvar aqui aparece como horário livre no site. Enquanto a jornada estiver
          vazia, o pedido público segue só pelo WhatsApp, sem inventar expediente.
        </p>
      </header>

      {hours.isError && (
        <Alert tone="danger" title="Não foi possível carregar a jornada">
          Recarregue a página.
        </Alert>
      )}

      {hours.isLoading && !days && (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando jornada">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      )}

      {days && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void saveHours.mutateAsync({ hours: payload }).catch((error: unknown) => {
              showToast({
                tone: 'danger',
                title: 'Não foi possível salvar',
                description: error instanceof ApiClientError ? error.message : 'Tente de novo.',
              });
            });
          }}
        >
          <ul className="flex flex-col gap-2">
            {days.map((day, weekday) => (
              <li
                key={WEEKDAY_LABELS[weekday]}
                className="rounded-card border-brown-100 flex flex-col gap-3 border bg-white px-4 py-3 sm:flex-row sm:items-center"
              >
                <label className="text-brown-900 flex min-w-40 items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="size-4 accent-gold-600"
                    checked={day.enabled}
                    onChange={(event) => {
                      const next = [...days];
                      next[weekday] = { ...day, enabled: event.target.checked };
                      setDraft(next);
                    }}
                  />
                  {WEEKDAY_LABELS[weekday]}
                </label>
                <div className="grid w-full min-w-0 grid-cols-1 gap-4 min-[400px]:grid-cols-2">
                  <Field label="Início" className="min-w-0">
                    {(props) => (
                      <Input
                        {...props}
                        type="time"
                        className="w-full min-w-0"
                        disabled={!day.enabled}
                        value={day.start}
                        onChange={(event) => {
                          const next = [...days];
                          next[weekday] = { ...day, start: event.target.value };
                          setDraft(next);
                        }}
                      />
                    )}
                  </Field>
                  <Field label="Fim" className="min-w-0">
                    {(props) => (
                      <Input
                        {...props}
                        type="time"
                        className="w-full min-w-0"
                        disabled={!day.enabled}
                        value={day.end}
                        onChange={(event) => {
                          const next = [...days];
                          next[weekday] = { ...day, end: event.target.value };
                          setDraft(next);
                        }}
                      />
                    )}
                  </Field>
                </div>
              </li>
            ))}
          </ul>
          <Button type="submit" isLoading={saveHours.isPending}>
            Salvar jornada
          </Button>
        </form>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-brown-900 text-lg font-semibold">Folga ou bloqueio</h2>
        <form
          className="rounded-card border-brown-100 flex flex-col gap-3 border bg-white p-4 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void createOff.mutateAsync().catch((error: unknown) => {
              showToast({
                tone: 'danger',
                title: 'Não foi possível registrar a folga',
                description: error instanceof ApiClientError ? error.message : 'Tente de novo.',
              });
            });
          }}
        >
          <Field label="Data" className="sm:w-40">
            {(props) => (
              <Input
                {...props}
                type="date"
                value={offDate}
                onChange={(event) => setOffDate(event.target.value as IsoDate)}
              />
            )}
          </Field>
          <Field label="Motivo (opcional)" className="flex-1">
            {(props) => (
              <Input {...props} value={offReason} onChange={(event) => setOffReason(event.target.value)} />
            )}
          </Field>
          <Button type="submit" variant="secondary" isLoading={createOff.isPending}>
            Bloquear dia
          </Button>
        </form>
        <ul className="text-brown-700 flex flex-col gap-1 text-sm">
          {(overrides.data?.items ?? []).map((item) => (
            <li key={item.id}>
              {item.date.split('-').reverse().join('/')} —{' '}
              {item.type === 'TIME_OFF' ? 'Folga' : item.type}{' '}
              {item.reason ? `(${item.reason})` : ''}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
