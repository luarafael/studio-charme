import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  EXPENSE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  formatCents,
  toZonedIsoDate,
  type DashboardDto,
  type ExpenseDto,
  type IsoDate,
  type PaymentDto,
} from '@studio-charme/contracts';
import { Plus } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table } from '@/components/ui/Table';
import { ExpenseComposer } from '@/features/finance/ExpenseComposer';
import { PaymentComposer } from '@/features/finance/PaymentComposer';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { api } from '@/lib/api';

function monthRange(today: IsoDate): { from: IsoDate; to: IsoDate } {
  const [year, month] = today.split('-') as [string, string];
  const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

export default function FinancePage() {
  useDocumentMeta({
    title: `Financeiro | ${siteConfig.name}`,
    noIndex: true,
  });

  const today = toZonedIsoDate(new Date());
  const range = monthRange(today);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardDto>('/dashboard'),
  });
  const payments = useQuery({
    queryKey: ['payments', range.from, range.to],
    queryFn: () => api<{ items: PaymentDto[] }>('/payments', { search: range }),
  });
  const expenses = useQuery({
    queryKey: ['expenses', range.from, range.to],
    queryFn: () => api<{ items: ExpenseDto[] }>('/expenses', { search: range }),
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-gold-700 text-sm font-semibold tracking-wide uppercase">Só a sua conta</p>
          <h1 className="text-display-sm text-brown-900 mt-1">Financeiro</h1>
          <p className="text-brown-600 mt-2 max-w-2xl text-sm">
            Recebido é o que já entrou. A receber é o que ainda falta dos atendimentos concluídos. O
            saldo é recebido menos despesas, não um resultado contábil. Nenhuma outra profissional vê
            estes números.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" leadingIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setExpenseOpen(true)}>
            Despesa
          </Button>
          <Button leadingIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setPaymentOpen(true)}>
            Recebimento
          </Button>
        </div>
      </header>

      {dashboard.isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardBody>
              <CardTitle>Recebido no mês</CardTitle>
              <p className="text-brown-900 mt-2 text-3xl font-semibold">{formatCents(data.receivedCents)}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <CardTitle>A receber</CardTitle>
              <p className="text-brown-900 mt-2 text-3xl font-semibold">{formatCents(data.pendingCents)}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <CardTitle>Despesas do mês</CardTitle>
              <p className="text-brown-900 mt-2 text-3xl font-semibold">{formatCents(data.expenseCents)}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <CardTitle>Saldo do mês</CardTitle>
              <p className="text-brown-900 mt-2 text-3xl font-semibold">{formatCents(data.balanceCents)}</p>
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
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-brown-900 text-lg font-semibold">Recebimentos do mês</h2>
        {payments.isError && <Alert tone="danger">Não foi possível carregar os recebimentos.</Alert>}
        {payments.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <Table
            caption="Recebimentos do mês"
            rows={payments.data?.items ?? []}
            getRowId={(row) => row.id}
            empty={
              <EmptyState
                title="Nenhum recebimento neste mês"
                description="Registre Pix, dinheiro ou cartão depois de concluir o atendimento, ou lance um valor avulso."
                action={
                  <Button variant="secondary" onClick={() => setPaymentOpen(true)}>
                    Registrar recebimento
                  </Button>
                }
              />
            }
            columns={[
              { key: 'paidOn', header: 'Data', render: (row) => row.paidOn.split('-').reverse().join('/') },
              { key: 'client', header: 'Cliente', render: (row) => row.clientName ?? 'Avulso' },
              { key: 'method', header: 'Forma', render: (row) => PAYMENT_METHOD_LABELS[row.method] },
              { key: 'status', header: 'Situação', render: (row) => PAYMENT_STATUS_LABELS[row.status] },
              {
                key: 'net',
                header: 'Valor',
                align: 'right',
                render: (row) => formatCents(row.netCents),
              },
            ]}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-brown-900 text-lg font-semibold">Despesas do mês</h2>
        {expenses.isError && <Alert tone="danger">Não foi possível carregar as despesas.</Alert>}
        {expenses.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <Table
            caption="Despesas do mês"
            rows={expenses.data?.items ?? []}
            getRowId={(row) => row.id}
            empty={
              <EmptyState
                title="Nenhuma despesa neste mês"
                description="Produtos, transporte e outros gastos da sua conta entram aqui."
                action={
                  <Button variant="secondary" onClick={() => setExpenseOpen(true)}>
                    Registrar despesa
                  </Button>
                }
              />
            }
            columns={[
              {
                key: 'incurredOn',
                header: 'Data',
                render: (row) => row.incurredOn.split('-').reverse().join('/'),
              },
              { key: 'description', header: 'Descrição', render: (row) => row.description },
              { key: 'category', header: 'Categoria', render: (row) => row.category },
              { key: 'status', header: 'Situação', render: (row) => EXPENSE_STATUS_LABELS[row.status] },
              {
                key: 'amount',
                header: 'Valor',
                align: 'right',
                render: (row) => formatCents(row.amountCents),
              },
            ]}
          />
        )}
      </section>

      <PaymentComposer
        key={paymentOpen ? 'open' : 'closed'}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
      />
      <ExpenseComposer
        key={expenseOpen ? 'open' : 'closed'}
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
      />
    </div>
  );
}
