import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import {
  addIsoDateDays,
  APPOINTMENT_STATUS_LABELS,
  isoDateSchema,
  toZonedIsoDate,
  type AppointmentDto,
  type AppointmentStatus,
  type IsoDate,
} from '@studio-charme/contracts';
import { CalendarPlus, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { DatePicker } from '@/components/ui/DatePicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useToast } from '@/hooks/useToast';
import { api, ApiClientError } from '@/lib/api';
import { AppointmentComposer } from '@/features/agenda/AppointmentComposer';
import {
  buildAppointmentConfirmationMessage,
  openClientWhatsApp,
} from '@/features/agenda/clientWhatsApp';
import { PaymentComposer } from '@/features/finance/PaymentComposer';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatAppointmentWhen, formatIsoDateLong, formatTime } from '@/features/agenda/format';
import {
  APPOINTMENT_STATUS_ACTION_LABEL,
  APPOINTMENT_STATUS_TONE,
  availableStatusActions,
} from '@/features/agenda/status';

export default function AgendaPage() {
  useDocumentMeta({
    title: `Agenda | ${siteConfig.name}`,
    noIndex: true,
  });

  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { professional } = useAuth();
  const [searchParams] = useSearchParams();
  const today = toZonedIsoDate(new Date());
  const dateFromQuery = isoDateSchema.safeParse(searchParams.get('date'));
  const [date, setDate] = useState<IsoDate>(dateFromQuery.success ? dateFromQuery.data : today);
  const [composerOpen, setComposerOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AppointmentDto | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [payTarget, setPayTarget] = useState<AppointmentDto | null>(null);

  useEffect(() => {
    const parsed = isoDateSchema.safeParse(searchParams.get('date'));
    if (parsed.success) setDate(parsed.data);
  }, [searchParams]);

  const list = useQuery({
    queryKey: ['appointments', date],
    queryFn: () =>
      api<{ items: AppointmentDto[] }>('/appointments', {
        search: { from: date, to: date },
      }),
  });

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: AppointmentStatus; cancelReason?: string }) =>
      api<AppointmentDto>(`/appointments/${input.id}/status`, {
        method: 'POST',
        body: { status: input.status, cancelReason: input.cancelReason },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  function notifyClientOnWhatsApp(appointment: AppointmentDto): void {
    const message = buildAppointmentConfirmationMessage({
      clientName: appointment.client.name,
      professionalName: professional?.name ?? siteConfig.name,
      serviceNames: appointment.services.map((service) => service.name).join(', '),
      when: formatAppointmentWhen(appointment.startsAt),
    });
    openClientWhatsApp(appointment.client.phone, message);
  }

  async function applyStatus(appointment: AppointmentDto, status: AppointmentStatus): Promise<void> {
    if (status === 'CANCELLED') {
      setCancelTarget(appointment);
      setCancelReason('');
      return;
    }
    try {
      const updated = await statusMutation.mutateAsync({ id: appointment.id, status });
      if (status === 'CONFIRMED') {
        notifyClientOnWhatsApp(updated);
        showToast({
          tone: 'success',
          title: 'Horário confirmado',
          description: `Toque em enviar no WhatsApp para avisar ${updated.client.name}.`,
        });
      } else {
        showToast({
          tone: 'success',
          title: 'Agenda atualizada',
          description: APPOINTMENT_STATUS_LABELS[status],
        });
      }
      if (status === 'COMPLETED') setPayTarget(updated);
    } catch (error) {
      showToast({
        tone: 'danger',
        title: 'Não foi possível atualizar',
        description: error instanceof ApiClientError ? error.message : 'Tente novamente.',
      });
    }
  }

  const items = list.data?.items ?? [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-gold-700 text-sm font-semibold tracking-wide uppercase">Sua agenda</p>
          <h1 className="text-display-sm text-brown-900 mt-1">{formatIsoDateLong(date)}</h1>
          <p className="text-brown-600 mt-2 max-w-xl text-sm">
            Só os seus horários aparecem aqui. Conflito de horário é bloqueado para a sua conta,
            não para o studio inteiro.
          </p>
        </div>
        <Button
          leadingIcon={<CalendarPlus className="size-4" aria-hidden="true" />}
          onClick={() => setComposerOpen(true)}
        >
          Novo atendimento
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <div className="flex flex-col gap-3">
          <DatePicker label="Escolher o dia da agenda" value={date} onChange={setDate} />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<ChevronLeft className="size-4" aria-hidden="true" />}
              onClick={() => setDate(addIsoDateDays(date, -1))}
            >
              Dia anterior
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDate(today)}>
              Hoje
            </Button>
            <Button
              variant="secondary"
              size="sm"
              trailingIcon={<ChevronRight className="size-4" aria-hidden="true" />}
              onClick={() => setDate(addIsoDateDays(date, 1))}
            >
              Próximo
            </Button>
          </div>
        </div>

        <div>
          {list.isError && (
            <Alert tone="danger" title="Não foi possível carregar a agenda">
              Recarregue a página. Se o erro continuar, saia e entre de novo.
            </Alert>
          )}

          {list.isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-28" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="Nenhum horário neste dia"
              description="Marque um atendimento ou escolha outro dia no calendário."
              action={
                <Button variant="secondary" onClick={() => setComposerOpen(true)}>
                  Marcar agora
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.id}>
                  <Card>
                    <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-gold-700 text-sm font-semibold">
                          {formatTime(item.startsAt)} – {formatTime(item.endsAt)}
                        </p>
                        <p className="text-brown-900 mt-1 text-lg font-semibold">{item.client.name}</p>
                        <p className="text-brown-600 text-sm">
                          {item.services.map((service) => service.name).join(', ')}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <Badge tone={APPOINTMENT_STATUS_TONE[item.status]} withDot>
                          {APPOINTMENT_STATUS_LABELS[item.status]}
                        </Badge>
                        <div className="flex flex-wrap gap-2">
                          {availableStatusActions(item.status).map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant={status === 'CANCELLED' || status === 'NO_SHOW' ? 'ghost' : 'secondary'}
                              isLoading={statusMutation.isPending}
                              onClick={() => void applyStatus(item, status)}
                            >
                              {APPOINTMENT_STATUS_ACTION_LABEL[status] ?? status}
                            </Button>
                          ))}
                          {item.status === 'CONFIRMED' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              leadingIcon={<MessageCircle className="size-4" aria-hidden="true" />}
                              onClick={() => notifyClientOnWhatsApp(item)}
                            >
                              Avisar no WhatsApp
                            </Button>
                          )}
                          {item.status === 'COMPLETED' && (
                            <Button size="sm" variant="secondary" onClick={() => setPayTarget(item)}>
                              Receber
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AppointmentComposer
        key={composerOpen ? 'open' : 'closed'}
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        date={date}
        onSaved={setDate}
      />

      <PaymentComposer
        key={payTarget?.id ?? 'avulso'}
        open={payTarget !== null}
        onClose={() => setPayTarget(null)}
        appointment={payTarget ?? undefined}
      />

      <Modal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title="Cancelar atendimento"
        description="O motivo fica no histórico da sua conta. A cliente não é avisada automaticamente nesta etapa."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              isLoading={statusMutation.isPending}
              onClick={() => {
                if (!cancelTarget || cancelReason.trim().length < 2) return;
                void statusMutation
                  .mutateAsync({
                    id: cancelTarget.id,
                    status: 'CANCELLED',
                    cancelReason: cancelReason.trim(),
                  })
                  .then(() => {
                    setCancelTarget(null);
                    showToast({ tone: 'success', title: 'Atendimento cancelado' });
                  })
                  .catch((error: unknown) => {
                    showToast({
                      tone: 'danger',
                      title: 'Não foi possível cancelar',
                      description: error instanceof ApiClientError ? error.message : 'Tente novamente.',
                    });
                  });
              }}
            >
              Confirmar cancelamento
            </Button>
          </>
        }
      >
        <Field label="Motivo" required>
          {(props) => (
            <Input
              {...props}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          )}
        </Field>
      </Modal>
    </div>
  );
}
