import { useQuery } from '@tanstack/react-query';
import { formatCents, type DashboardDto } from '@studio-charme/contracts';
import { CalendarClock, CircleAlert, Users, Wallet } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Card, CardBody, CardTitle } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatAppointmentWhen } from '@/features/agenda/format';

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

export default function DashboardPage() {
  const { professional } = useAuth();
  useDocumentMeta({
    title: `Painel | ${siteConfig.name}`,
    noIndex: true,
  });

  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardDto>('/dashboard'),
  });

  if (dashboard.isError) {
    return (
      <Alert tone="danger" title="Não foi possível carregar o painel">
        Tente recarregar a página. Nenhum dado de outra profissional é exibido aqui.
      </Alert>
    );
  }

  const data = dashboard.data;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header>
        <p className="text-gold-700 text-sm font-semibold tracking-wide uppercase">Hoje</p>
        <h1 className="text-display-sm text-brown-900 mt-1">Olá, {professional?.name}</h1>
        <p className="text-brown-600 mt-2 max-w-2xl text-sm">
          Este painel usa só os seus atendimentos, recebimentos e despesas. Recebido é o que já
          entrou; pendente é o que ainda falta receber; o saldo é recebido menos despesas, não um
          resultado contábil.
        </p>
      </header>

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
              label="Atendimentos de hoje"
              value={String(data.todayCount)}
              hint="Na sua agenda de hoje"
              icon={CalendarClock}
            />
            <Metric
              label="Recebido no mês"
              value={formatCents(data.receivedCents)}
              hint="Pagamentos registrados como pagos"
              icon={Wallet}
            />
            <Metric
              label="A receber"
              value={formatCents(data.pendingCents)}
              hint="Atendimentos concluídos ainda sem pagamento total"
              icon={CircleAlert}
            />
            <Metric
              label="Clientes no mês"
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
                <CardTitle>Cancelamentos no mês</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">{data.cancelledCount}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <CardTitle>Ausências no mês</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">{data.noShowCount}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <CardTitle>Ticket médio</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">
                  {formatCents(data.averageTicketCents)}
                </p>
                <p className="text-brown-500 mt-1 text-xs">Sobre atendimentos concluídos no mês</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <CardTitle>Despesas do mês</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">
                  {formatCents(data.expenseCents)}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <CardTitle>Saldo do mês</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">
                  {formatCents(data.balanceCents)}
                </p>
                <p className="text-brown-500 mt-1 text-xs">Recebido menos despesas</p>
              </CardBody>
            </Card>
          </div>

          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="text-brown-900 mb-3 text-lg font-semibold">Agenda de hoje</h2>
              {data.todayAppointments.length === 0 ? (
                <EmptyState
                  title="Nenhum atendimento hoje"
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
                  description="Novos horários confirmados entram nesta lista."
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.upcomingAppointments.map((item) => (
                    <li key={item.id}>
                      <Card>
                        <CardBody>
                          <p className="text-brown-900 font-semibold">{item.client.name}</p>
                          <p className="text-brown-600 text-sm">{formatAppointmentWhen(item.startsAt)}</p>
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
    </div>
  );
}
