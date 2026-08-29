import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCents, type AppointmentDto } from '@studio-charme/contracts';
import { History, Trash2 } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppointmentDetailModal } from '@/features/agenda/AppointmentDetailModal';
import { formatAppointmentWhen } from '@/features/agenda/format';
import { APPOINTMENT_STATUS_TONE } from '@/features/agenda/status';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useToast } from '@/hooks/useToast';
import { api, ApiClientError } from '@/lib/api';

export default function HistoryPage() {
  useDocumentMeta({
    title: `Histórico | ${siteConfig.name}`,
    noIndex: true,
  });

  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AppointmentDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppointmentDto | null>(null);

  const list = useQuery({
    queryKey: ['appointments', 'history', search],
    queryFn: () =>
      api<{ items: AppointmentDto[] }>('/appointments/history', {
        search: { search: search.trim() || undefined },
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/appointments/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteTarget(null);
      setSelected(null);
      showToast({ tone: 'success', title: 'Atendimento excluído do histórico' });
    },
  });

  const items = list.data?.items ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <p className="text-gold-700 text-sm font-semibold tracking-wide uppercase">Sua agenda</p>
        <h1 className="text-display-sm text-brown-900 mt-1">Histórico de atendimentos</h1>
        <p className="text-brown-600 mt-2 max-w-xl text-sm">
          Todos os horários que você já concluiu, do mais recente ao mais antigo. Toque no card para
          ver cliente, serviços e valores.
        </p>
      </header>

      <Field label="Buscar no histórico">
        {(props) => (
          <Input
            {...props}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome ou WhatsApp da cliente"
          />
        )}
      </Field>

      {list.isError && (
        <Alert tone="danger" title="Não foi possível carregar o histórico">
          Recarregue a página. Se o erro continuar, saia e entre de novo.
        </Alert>
      )}

      {list.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<History className="size-8" aria-hidden="true" />}
          title={search.trim() ? 'Nenhum atendimento encontrado' : 'Nenhum atendimento concluído ainda'}
          description={
            search.trim()
              ? 'Tente outro nome ou WhatsApp.'
              : 'Quando você concluir um horário na agenda, ele aparece aqui.'
          }
        />
      ) : (
        <>
          {items.length === 200 && (
            <p className="text-brown-500 text-sm">Mostrando os 200 atendimentos mais recentes.</p>
          )}
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id}>
                <Card>
                  <button
                    type="button"
                    className="w-full text-left"
                    aria-label={`Ver atendimento de ${item.client.name}`}
                    onClick={() => setSelected(item)}
                  >
                    <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-gold-700 text-sm font-semibold">
                          {formatAppointmentWhen(item.startsAt)}
                        </p>
                        <p className="text-brown-900 mt-1 truncate text-lg font-semibold">
                          {item.client.name}
                        </p>
                        <p className="text-brown-600 text-sm">
                          {item.services.map((service) => service.name).join(', ')}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <Badge tone={APPOINTMENT_STATUS_TONE[item.status]} withDot>
                          Concluído
                        </Badge>
                        <p className="text-brown-900 text-base font-semibold">
                          {formatCents(item.totalPriceCents)}
                        </p>
                      </div>
                    </CardBody>
                  </button>
                  <div className="border-brown-50 flex justify-end border-t px-6 py-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      leadingIcon={<Trash2 className="size-3.5" aria-hidden="true" />}
                      onClick={() => setDeleteTarget(item)}
                    >
                      Excluir
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <AppointmentDetailModal
        appointment={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Excluir do histórico?"
        description="O atendimento some do histórico e da agenda. Esta ação não se desfaz."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                void deleteMutation.mutateAsync(deleteTarget.id).catch((error: unknown) => {
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
          {deleteTarget
            ? `${deleteTarget.client.name} · ${formatAppointmentWhen(deleteTarget.startsAt)}.`
            : null}
        </p>
      </Modal>
    </div>
  );
}
