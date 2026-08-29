import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  formatCents,
  rangeForPeriod,
  toZonedIsoDate,
  type AppointmentDto,
  type DashboardDto,
  type DashboardPeriod,
  type IsoDate,
} from '@studio-charme/contracts';
import { CalendarClock, CircleAlert, Pencil, Trash2, Users, Wallet } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Card, CardBody, CardTitle } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useToast } from '@/hooks/useToast';
import { api, ApiClientError } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatAppointmentWhen } from '@/features/agenda/format';
import { PeriodToolbar, periodNoun } from '@/features/finance/PeriodToolbar';

function Metric({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Wallet;
}) {
  return (
    <Card>
      <CardBody className="flex gap-4">
        <div className="bg-gold-100 text-gold-700 grid size-11 place-items-center rounded-full">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-brown-500 text-sm">{label}</p>
          <p className="text-brown-900 text-2xl font-semibold">{value}</p>
          <p className="text-brown-500 mt-1 text-xs">{hint}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function appointmentDate(item: AppointmentDto): IsoDate {
  return toZonedIsoDate(new Date(item.startsAt));
}

export default function DashboardPage() {
  const { professional } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  useDocumentMeta({
    title: `Painel | ${siteConfig.name}`,
    noIndex: true,
  });

  const today = toZonedIsoDate(new Date());
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [anchor, setAnchor] = useState<IsoDate>(today);
  const range = rangeForPeriod(period, anchor);
  const noun = periodNoun(period);
  const [cancelTarget, setCancelTarget] = useState<AppointmentDto | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const dashboard = useQuery({
    queryKey: ['dashboard', range.from, range.to],
    queryFn: () =>
      api<DashboardDto>('/dashboard', { search: { from: range.from, to: range.to } }),
  });

  const cancelMutation = useMutation({
    mutationFn: (input: { id: string; cancelReason: string }) =>
      api<AppointmentDto>(`/appointments/${input.id}/status`, {
        method: 'POST',
        body: { status: 'CANCELLED', cancelReason: input.cancelReason },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  function openOnAgenda(item: AppointmentDto): void {
    void navigate(`/app/agenda?date=${appointmentDate(item)}`);
  }

  if (dashboard.isError) {
    return (
      <Alert tone="danger" title="Não foi possível carregar o painel">
        Tente recarregar a página. Nenhum dado de outra profissional é exibido aqui.
      </Alert>
    );
  }

  const data = dashboard.data;

  function appointmentActions(item: AppointmentDto) {
    const canCancel = item.status !== 'CANCELLED' && item.status !== 'COMPLETED' && item.status !== 'NO_SHOW';
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          leadingIcon={<Pencil className="size-3.5" aria-hidden="true" />}
          onClick={() => openOnAgenda(item)}
        >
          Editar
        </Button>
        {canCancel && (
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<Trash2 className="size-3.5" aria-hidden="true" />}
            onClick={() => {
              setCancelTarget(item);
              setCancelReason('');
            }}
          >
            Excluir
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header>
        <p className="text-gold-700 text-sm font-semibold tracking-wide uppercase">Painel</p>
        <h1 className="text-display-sm text-brown-900 mt-1">Olá, {professional?.name}</h1>
        <p className="text-brown-600 mt-2 max-w-2xl text-sm">
          Este painel usa só os seus atendimentos, recebimentos e despesas. Recebido é o que já
          entrou; a receber é o que ainda falta; o saldo é recebido menos despesas.
        </p>
      </header>

      <PeriodToolbar
        period={period}
        onPeriodChange={setPeriod}
        anchor={anchor}
        onAnchorChange={setAnchor}
        label="Período do painel"
      />

      {dashboard.isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label={`Atendimentos do ${noun}`}
              value={String(data.todayCount)}
              hint="Na sua agenda neste recorte"
              icon={CalendarClock}
            />
            <Metric
              label={`Recebido no ${noun}`}
              value={formatCents(data.receivedCents)}
              hint="Pagamentos registrados como pagos"
              icon={Wallet}
            />
            <Metric
              label="A receber"
              value={formatCents(data.pendingCents)}
              hint="Cadastros a receber e atendimentos concluídos sem pagamento total"
              icon={CircleAlert}
            />
            <Metric
              label="Clientes no período"
              value={String(data.clientsServed)}
              hint="Pessoas atendidas e concluídas"
              icon={Users}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardBody>
                <CardTitle>Confirmações pendentes</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">{data.pendingCount}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <CardTitle>Cancelamentos no {noun}</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">{data.cancelledCount}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <CardTitle>Ausências no {noun}</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">{data.noShowCount}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <CardTitle>Ticket médio</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">
                  {formatCents(data.averageTicketCents)}
                </p>
                <p className="text-brown-500 mt-1 text-xs">Sobre atendimentos concluídos no período</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <CardTitle>Despesas do {noun}</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">
                  {formatCents(data.expenseCents)}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <CardTitle>Saldo do {noun}</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">
                  {formatCents(data.balanceCents)}
                </p>
                <p className="text-brown-500 mt-1 text-xs">Recebido menos despesas</p>
              </CardBody>
            </Card>
          </div>

          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="text-brown-900 mb-3 text-lg font-semibold">
                Agenda do {noun}
              </h2>
              {data.todayAppointments.length === 0 ? (
                <EmptyState
                  title={`Nenhum atendimento neste ${noun}`}
                  description="Quando houver horários marcados, eles aparecem aqui."
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.todayAppointments.map((item) => (
                    <li key={item.id}>
                      <Card>
                        <CardBody>
                          <p className="text-brown-900 font-semibold">{item.client.name}</p>
                          <p className="text-brown-600 text-sm">
                            {formatAppointmentWhen(item.startsAt)} ·{' '}
                            {item.services.map((service) => service.name).join(', ')}
                          </p>
                          {appointmentActions(item)}
                        </CardBody>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="text-brown-900 mb-3 text-lg font-semibold">Próximos</h2>
              {data.upcomingAppointments.length === 0 ? (
                <EmptyState
                  title="Nada agendado à frente"
                  description="Horários confirmados ou aguardando, a partir de agora, entram nesta lista."
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.upcomingAppointments.map((item) => (
                    <li key={item.id}>
                      <Card>
                        <CardBody>
                          <p className="text-brown-900 font-semibold">{item.client.name}</p>
                          <p className="text-brown-600 text-sm">{formatAppointmentWhen(item.startsAt)}</p>
                          {appointmentActions(item)}
                        </CardBody>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      <Modal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title="Excluir atendimento?"
        description="O horário é cancelado na sua agenda. Informe o motivo para o histórico."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              isLoading={cancelMutation.isPending}
              onClick={() => {
                if (!cancelTarget || cancelReason.trim().length < 2) return;
                void cancelMutation
                  .mutateAsync({ id: cancelTarget.id, cancelReason: cancelReason.trim() })
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
              Excluir
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
