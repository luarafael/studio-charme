import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EXPENSE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  formatCents,
  rangeForPeriod,
  toZonedIsoDate,
  type DashboardDto,
  type DashboardPeriod,
  type ExpenseDto,
  type IsoDate,
  type PaymentDto,
} from '@studio-charme/contracts';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table } from '@/components/ui/Table';
import { ExpenseComposer } from '@/features/finance/ExpenseComposer';
import { PaymentComposer } from '@/features/finance/PaymentComposer';
import { PeriodToolbar, periodNoun } from '@/features/finance/PeriodToolbar';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useToast } from '@/hooks/useToast';
import { api, ApiClientError } from '@/lib/api';

export default function FinancePage() {
  useDocumentMeta({
    title: `Financeiro | ${siteConfig.name}`,
    noIndex: true,
  });

  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const today = toZonedIsoDate(new Date());
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [anchor, setAnchor] = useState<IsoDate>(today);
  const range = rangeForPeriod(period, anchor);
  const noun = periodNoun(period);

  const [paymentTarget, setPaymentTarget] = useState<PaymentDto | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<'received' | 'receivable'>('received');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [expenseTarget, setExpenseTarget] = useState<ExpenseDto | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentDto | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseDto | null>(null);

  const dashboard = useQuery({
    queryKey: ['dashboard', range.from, range.to],
    queryFn: () =>
      api<DashboardDto>('/dashboard', { search: { from: range.from, to: range.to } }),
  });
  const payments = useQuery({
    queryKey: ['payments', range.from, range.to],
    queryFn: () => api<{ items: PaymentDto[] }>('/payments', { search: range }),
  });
  const expenses = useQuery({
    queryKey: ['expenses', range.from, range.to],
    queryFn: () => api<{ items: ExpenseDto[] }>('/expenses', { search: range }),
  });

  const deletePayment = useMutation({
    mutationFn: (id: string) => api(`/payments/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      setPaymentToDelete(null);
      showToast({ tone: 'success', title: 'Lançamento excluído' });
    },
  });
  const deleteExpense = useMutation({
    mutationFn: (id: string) => api(`/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setExpenseToDelete(null);
      showToast({ tone: 'success', title: 'Despesa excluída' });
    },
  });

  function openNewPayment(intent: 'received' | 'receivable'): void {
    setPaymentTarget(null);
    setPaymentIntent(intent);
    setPaymentOpen(true);
  }

  function closePayment(): void {
    setPaymentOpen(false);
    setPaymentTarget(null);
  }

  function closeExpense(): void {
    setExpenseOpen(false);
    setExpenseTarget(null);
  }

  if (dashboard.isError) {
    return (
      <Alert tone="danger" title="Não foi possível carregar o financeiro">
        Tente recarregar a página.
      </Alert>
    );
  }

  const data = dashboard.data;
  const receivedItems = (payments.data?.items ?? []).filter((item) => item.status !== 'PENDING');
  const receivableItems = (payments.data?.items ?? []).filter((item) => item.status === 'PENDING');

  function paymentActions(row: PaymentDto) {
    return (
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          leadingIcon={<Pencil className="size-3.5" aria-hidden="true" />}
          onClick={() => {
            setPaymentTarget(row);
            setPaymentIntent(row.status === 'PENDING' ? 'receivable' : 'received');
            setPaymentOpen(true);
          }}
        >
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<Trash2 className="size-3.5" aria-hidden="true" />}
          onClick={() => setPaymentToDelete(row)}
        >
          Excluir
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-gold-700 text-sm font-semibold tracking-wide uppercase">Só a sua conta</p>
          <h1 className="text-display-sm text-brown-900 mt-1">Financeiro</h1>
          <p className="text-brown-600 mt-2 max-w-2xl text-sm">
            Recebido é o que já entrou. A receber é o que você cadastrou para entrar e o que ainda
            falta dos atendimentos concluídos. O saldo é recebido menos despesas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" leadingIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => openNewPayment('receivable')}>
            A receber
          </Button>
          <Button variant="secondary" leadingIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => { setExpenseTarget(null); setExpenseOpen(true); }}>
            Despesa
          </Button>
          <Button leadingIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => openNewPayment('received')}>
            Recebimento
          </Button>
        </div>
      </header>

      <PeriodToolbar
        period={period}
        onPeriodChange={setPeriod}
        anchor={anchor}
        onAnchorChange={setAnchor}
        label="Período do financeiro"
      />

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
              <CardTitle>Recebido no {noun}</CardTitle>
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
              <CardTitle>Despesas do {noun}</CardTitle>
              <p className="text-brown-900 mt-2 text-3xl font-semibold">{formatCents(data.expenseCents)}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <CardTitle>Saldo do {noun}</CardTitle>
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
        <h2 className="text-brown-900 text-lg font-semibold">A receber</h2>
        {payments.isError && <Alert tone="danger">Não foi possível carregar os valores a receber.</Alert>}
        {payments.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <Table
            caption="A receber no período"
            rows={receivableItems}
            getRowId={(row) => row.id}
            renderRowActions={paymentActions}
            empty={
              <EmptyState
                title={`Nada a receber neste ${noun}`}
                description="Cadastre um valor combinado que ainda não entrou. Ele soma no A receber do painel."
                action={
                  <Button variant="secondary" onClick={() => openNewPayment('receivable')}>
                    Registrar a receber
                  </Button>
                }
              />
            }
            columns={[
              { key: 'paidOn', header: 'Data', render: (row) => row.paidOn.split('-').reverse().join('/') },
              { key: 'client', header: 'Cliente', render: (row) => row.clientName ?? 'Avulso' },
              { key: 'method', header: 'Forma', render: (row) => PAYMENT_METHOD_LABELS[row.method] },
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
        <h2 className="text-brown-900 text-lg font-semibold">Recebimentos</h2>
        {payments.isError && <Alert tone="danger">Não foi possível carregar os recebimentos.</Alert>}
        {payments.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <Table
            caption="Recebimentos do período"
            rows={receivedItems}
            getRowId={(row) => row.id}
            renderRowActions={paymentActions}
            empty={
              <EmptyState
                title={`Nenhum recebimento neste ${noun}`}
                description="Registre Pix, dinheiro ou cartão depois de concluir o atendimento, ou lance um valor avulso."
                action={
                  <Button variant="secondary" onClick={() => openNewPayment('received')}>
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
        <h2 className="text-brown-900 text-lg font-semibold">Despesas</h2>
        {expenses.isError && <Alert tone="danger">Não foi possível carregar as despesas.</Alert>}
        {expenses.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <Table
            caption="Despesas do período"
            rows={expenses.data?.items ?? []}
            getRowId={(row) => row.id}
            renderRowActions={(row) => (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leadingIcon={<Pencil className="size-3.5" aria-hidden="true" />}
                  onClick={() => {
                    setExpenseTarget(row);
                    setExpenseOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leadingIcon={<Trash2 className="size-3.5" aria-hidden="true" />}
                  onClick={() => setExpenseToDelete(row)}
                >
                  Excluir
                </Button>
              </div>
            )}
            empty={
              <EmptyState
                title={`Nenhuma despesa neste ${noun}`}
                description="Produtos, transporte e outros gastos da sua conta entram aqui."
                action={
                  <Button variant="secondary" onClick={() => { setExpenseTarget(null); setExpenseOpen(true); }}>
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
        key={paymentOpen ? (paymentTarget?.id ?? paymentIntent) : 'closed'}
        open={paymentOpen}
        onClose={closePayment}
        payment={paymentTarget ?? undefined}
        intent={paymentIntent}
      />
      <ExpenseComposer
        key={expenseOpen ? (expenseTarget?.id ?? 'new') : 'closed'}
        open={expenseOpen}
        onClose={closeExpense}
        expense={expenseTarget ?? undefined}
      />

      <Modal
        open={paymentToDelete !== null}
        onClose={() => setPaymentToDelete(null)}
        title="Excluir lançamento?"
        description="O valor some do seu financeiro. Esta ação não se desfaz."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPaymentToDelete(null)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              isLoading={deletePayment.isPending}
              onClick={() => {
                if (!paymentToDelete) return;
                void deletePayment.mutateAsync(paymentToDelete.id).catch((error: unknown) => {
                  showToast({
                    tone: 'danger',
                    title: 'Não foi possível excluir',
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
        <p className="text-brown-700 text-sm">
          {paymentToDelete
            ? `${formatCents(paymentToDelete.netCents)} de ${paymentToDelete.clientName ?? 'lançamento avulso'}.`
            : null}
        </p>
      </Modal>

      <Modal
        open={expenseToDelete !== null}
        onClose={() => setExpenseToDelete(null)}
        title="Excluir despesa?"
        description="O gasto some do seu saldo. Esta ação não se desfaz."
        footer={
          <>
            <Button variant="ghost" onClick={() => setExpenseToDelete(null)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              isLoading={deleteExpense.isPending}
              onClick={() => {
                if (!expenseToDelete) return;
                void deleteExpense.mutateAsync(expenseToDelete.id).catch((error: unknown) => {
                  showToast({
                    tone: 'danger',
                    title: 'Não foi possível excluir',
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
        <p className="text-brown-700 text-sm">{expenseToDelete?.description}</p>
      </Modal>
    </div>
  );
}
