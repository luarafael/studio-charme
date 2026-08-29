import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { formatCents, type DashboardDto } from '@studio-charme/contracts';
import { siteConfig } from '@/config/site';
import { Alert } from '@/components/ui/Alert';
import { Card, CardBody, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { buttonClasses } from '@/components/ui/styles';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { api } from '@/lib/api';

export default function FinancePage() {
  useDocumentMeta({
    title: `Financeiro | ${siteConfig.name}`,
    noIndex: true,
  });

  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardDto>('/dashboard'),
  });

  if (dashboard.isError) {
    return (
      <Alert tone="danger" title="Não foi possível carregar o financeiro">
        Tente recarregar a página.
      </Alert>
    );
  }

  const data = dashboard.data;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header>
        <p className="text-gold-700 text-sm font-semibold tracking-wide uppercase">Só a sua conta</p>
        <h1 className="text-display-sm text-brown-900 mt-1">Financeiro</h1>
        <p className="text-brown-600 mt-2 max-w-2xl text-sm">
          Recebido é o que já entrou. A receber é o que ainda falta dos atendimentos concluídos. O
          saldo é recebido menos despesas, não um resultado contábil. Nenhuma outra profissional vê
          estes números.
        </p>
      </header>

      {dashboard.isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardBody>
                <CardTitle>Recebido no mês</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">
                  {formatCents(data.receivedCents)}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <CardTitle>A receber</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">
                  {formatCents(data.pendingCents)}
                </p>
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
            <Card>
              <CardBody>
                <CardTitle>Ticket médio</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">
                  {formatCents(data.averageTicketCents)}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <CardTitle>Comissão estimada</CardTitle>
                <p className="text-brown-900 mt-2 text-3xl font-semibold">
                  {formatCents(data.estimatedCommissionCents)}
                </p>
                <p className="text-brown-500 mt-1 text-xs">Sobre o valor já recebido</p>
              </CardBody>
            </Card>
          </div>

          {data.receivedCents === 0 && data.expenseCents === 0 ? (
            <EmptyState
              title="Ainda sem pagamentos ou despesas"
              description="O lançamento de Pix, dinheiro e gastos entra na próxima etapa. Enquanto isso, conclua atendimentos na agenda para o painel começar a contar o que foi feito."
              action={
                <Link to="/app/agenda" className={buttonClasses({ variant: 'secondary' })}>
                  Ir para a agenda
                </Link>
              }
            />
          ) : null}
        </>
      )}
    </div>
  );
}
