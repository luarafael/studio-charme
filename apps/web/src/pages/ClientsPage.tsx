import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  createClientBodySchema,
  formatBrazilianPhone,
  formatCents,
  maskBrazilianPhone,
  parseCurrencyToCents,
  type ClientDto,
  type ServiceDto,
} from '@studio-charme/contracts';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useToast } from '@/hooks/useToast';
import { api, ApiClientError } from '@/lib/api';

const clientFormSchema = createClientBodySchema.refine((data) => data.consentGiven, {
  path: ['consentGiven'],
  message: 'É preciso o consentimento da cliente para guardar o contato.',
});
type ClientFormInput = z.input<typeof clientFormSchema>;

const serviceFormSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    category: z.string().trim().min(2).max(40),
    durationMinutes: z.coerce.number().int().min(5, 'Duração mínima de 5 minutos.').max(12 * 60),
    bufferAfterMinutes: z.coerce.number().int().min(0).max(120),
    priceLabel: z.string().min(1, 'Informe o valor.'),
  })
  .transform((data, ctx) => {
    const priceCents = parseCurrencyToCents(data.priceLabel);
    if (priceCents === null || priceCents < 0) {
      ctx.addIssue({ code: 'custom', path: ['priceLabel'], message: 'Informe um valor em reais.' });
      return z.NEVER;
    }
    return {
      name: data.name,
      category: data.category,
      durationMinutes: data.durationMinutes,
      bufferAfterMinutes: data.bufferAfterMinutes,
      priceCents,
    };
  });

type ServiceFormInput = z.input<typeof serviceFormSchema>;
type ServiceFormOutput = z.output<typeof serviceFormSchema>;

const SERVICE_DEFAULTS: ServiceFormInput = {
  name: '',
  category: 'Geral',
  durationMinutes: 60,
  bufferAfterMinutes: 0,
  priceLabel: '',
};

function centsToPriceLabel(cents: number): string {
  return formatCents(cents).replace(/[^\d,]/g, '');
}

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : 'Confira os dados e tente de novo.';
}

export default function ClientsPage() {
  useDocumentMeta({
    title: `Clientes | ${siteConfig.name}`,
    noIndex: true,
  });

  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [editingClient, setEditingClient] = useState<ClientDto | null>(null);
  const [clientOpen, setClientOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientDto | null>(null);
  const [editingService, setEditingService] = useState<ServiceDto | null>(null);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceDto | null>(null);
  const [search, setSearch] = useState('');
  const [phoneMask, setPhoneMask] = useState('');

  const clients = useQuery({
    queryKey: ['clients', search],
    queryFn: () => api<{ items: ClientDto[] }>('/clients', { search: { search } }),
  });
  const services = useQuery({
    queryKey: ['services'],
    queryFn: () => api<{ items: ServiceDto[] }>('/services'),
  });

  const clientForm = useForm<ClientFormInput, unknown, z.output<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: { name: '', phone: '', notes: '', consentGiven: false },
  });

  const serviceForm = useForm<ServiceFormInput, unknown, ServiceFormOutput>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: SERVICE_DEFAULTS,
  });

  function closeClientModal(): void {
    setClientOpen(false);
    setEditingClient(null);
    clientForm.reset({ name: '', phone: '', notes: '', consentGiven: false });
    setPhoneMask('');
  }

  function openNewClient(): void {
    setEditingClient(null);
    clientForm.reset({ name: '', phone: '', notes: '', consentGiven: false });
    setPhoneMask('');
    setClientOpen(true);
  }

  function openEditClient(client: ClientDto): void {
    const masked = formatBrazilianPhone(client.phone);
    setEditingClient(client);
    clientForm.reset({
      name: client.name,
      phone: masked,
      notes: client.notes ?? '',
      consentGiven: true,
    });
    setPhoneMask(masked);
    setClientOpen(true);
  }

  function closeServiceModal(): void {
    setServiceOpen(false);
    setEditingService(null);
    serviceForm.reset(SERVICE_DEFAULTS);
  }

  function openNewService(): void {
    setEditingService(null);
    serviceForm.reset(SERVICE_DEFAULTS);
    setServiceOpen(true);
  }

  function openEditService(service: ServiceDto): void {
    setEditingService(service);
    serviceForm.reset({
      name: service.name,
      category: service.category,
      durationMinutes: service.durationMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
      priceLabel: centsToPriceLabel(service.priceCents),
    });
    setServiceOpen(true);
  }

  const saveClient = useMutation({
    mutationFn: async (body: z.output<typeof clientFormSchema>) => {
      if (editingClient) {
        return api<ClientDto>(`/clients/${editingClient.id}`, {
          method: 'PATCH',
          body: { name: body.name, phone: body.phone, notes: body.notes },
        });
      }
      return api<ClientDto>('/clients', { method: 'POST', body });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      showToast({
        tone: 'success',
        title: editingClient ? 'Cliente atualizada' : 'Cliente cadastrada',
      });
      closeClientModal();
    },
  });

  const removeClient = useMutation({
    mutationFn: (id: string) => api(`/clients/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      showToast({ tone: 'success', title: 'Cliente excluída' });
      setClientToDelete(null);
    },
  });

  const saveService = useMutation({
    mutationFn: async (body: ServiceFormOutput) => {
      if (editingService) {
        return api<ServiceDto>(`/services/${editingService.id}`, { method: 'PATCH', body });
      }
      return api<ServiceDto>('/services', { method: 'POST', body });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      showToast({
        tone: 'success',
        title: editingService ? 'Serviço atualizado' : 'Serviço cadastrado',
      });
      closeServiceModal();
    },
  });

  const removeService = useMutation({
    mutationFn: (id: string) => api(`/services/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      showToast({ tone: 'success', title: 'Serviço excluído' });
      setServiceToDelete(null);
    },
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      <header>
        <p className="text-gold-700 text-sm font-semibold tracking-wide uppercase">Sua lista</p>
        <h1 className="text-display-sm text-brown-900 mt-1">Clientes e serviços</h1>
        <p className="text-brown-600 mt-2 max-w-2xl text-sm">
          Só as pessoas e os serviços da sua conta. O mesmo WhatsApp pode existir na lista de outra
          profissional, e vocês não veem uma à outra.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-sm flex-1">
            <Field label="Buscar cliente">
              {(props) => (
                <Input
                  {...props}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nome ou WhatsApp"
                />
              )}
            </Field>
          </div>
          <Button leadingIcon={<Plus className="size-4" aria-hidden="true" />} onClick={openNewClient}>
            Nova cliente
          </Button>
        </div>

        {clients.isError && (
          <Alert tone="danger" title="Não foi possível carregar as clientes">
            Recarregue a página.
          </Alert>
        )}

        {clients.isLoading ? (
          <Skeleton className="h-40" />
        ) : (clients.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="Nenhuma cliente ainda"
            description="Cadastre quem você atende para marcar horários na agenda."
            action={
              <Button variant="secondary" onClick={openNewClient}>
                Cadastrar cliente
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {clients.data!.items.map((client) => (
              <li key={client.id} className="min-w-0">
                <Card className="h-full">
                  <CardBody className="flex h-full flex-col">
                    <p className="text-brown-900 truncate font-semibold">{client.name}</p>
                    <p className="text-brown-600 mt-1 truncate text-sm">
                      {formatBrazilianPhone(client.phone)}
                    </p>
                    <p
                      className="text-brown-500 mt-2 line-clamp-2 min-h-10 text-sm"
                      title={client.notes?.trim() || undefined}
                    >
                      {client.notes?.trim() || 'Sem observações'}
                    </p>
                    <div className="mt-auto flex gap-2 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        leadingIcon={<Pencil className="size-3.5" aria-hidden="true" />}
                        onClick={() => openEditClient(client)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leadingIcon={<Trash2 className="size-3.5" aria-hidden="true" />}
                        onClick={() => setClientToDelete(client)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-brown-900 text-lg font-semibold">Seus serviços</h2>
          <Button
            variant="secondary"
            leadingIcon={<Plus className="size-4" aria-hidden="true" />}
            onClick={openNewService}
          >
            Novo serviço
          </Button>
        </div>

        {services.isError && (
          <Alert tone="danger" title="Não foi possível carregar os serviços">
            Recarregue a página.
          </Alert>
        )}

        {services.isLoading ? (
          <Skeleton className="h-28" />
        ) : (services.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="Nenhum serviço cadastrado"
            description="A duração e o valor entram na agenda e no financeiro. Cadastre o que você oferece."
            action={
              <Button variant="secondary" onClick={openNewService}>
                Cadastrar serviço
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {services.data!.items.map((service) => (
              <li
                key={service.id}
                className="rounded-card border-brown-100 flex flex-col gap-3 border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-brown-900 font-medium">{service.name}</p>
                  <p className="text-brown-500 text-sm">
                    {service.category} · {service.durationMinutes} min
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  <p className="text-brown-900 mr-2 font-semibold">{formatCents(service.priceCents)}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    leadingIcon={<Pencil className="size-3.5" aria-hidden="true" />}
                    onClick={() => openEditService(service)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon={<Trash2 className="size-3.5" aria-hidden="true" />}
                    onClick={() => setServiceToDelete(service)}
                  >
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={clientOpen}
        onClose={closeClientModal}
        title={editingClient ? 'Editar cliente' : 'Nova cliente'}
        description={
          editingClient
            ? 'As alterações valem só na sua lista.'
            : 'O contato fica só na sua lista.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={closeClientModal}>
              Cancelar
            </Button>
            <Button type="submit" form="client-form" isLoading={saveClient.isPending}>
              Salvar
            </Button>
          </>
        }
      >
        <form
          id="client-form"
          className="flex flex-col gap-4"
          onSubmit={clientForm.handleSubmit(async (values) => {
            try {
              await saveClient.mutateAsync(values);
            } catch (error) {
              showToast({
                tone: 'danger',
                title: 'Não foi possível salvar',
                description: errorMessage(error),
              });
            }
          })}
        >
          <Field label="Nome" required error={clientForm.formState.errors.name?.message}>
            {(props) => <Input {...props} autoComplete="name" {...clientForm.register('name')} />}
          </Field>
          <Field
            label="WhatsApp"
            required
            error={clientForm.formState.errors.phone?.message}
            hint="Com DDD"
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
                  clientForm.setValue('phone', next, { shouldValidate: true });
                }}
              />
            )}
          </Field>
          <Field label="Observações" error={clientForm.formState.errors.notes?.message}>
            {(props) => <Textarea {...props} {...clientForm.register('notes')} />}
          </Field>
          {!editingClient && (
            <>
              <label className="text-brown-700 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-gold-600"
                  {...clientForm.register('consentGiven')}
                />
                A cliente autorizou guardar o contato e receber avisos desta profissional.
              </label>
              {clientForm.formState.errors.consentGiven && (
                <p className="text-danger-700 text-sm">{clientForm.formState.errors.consentGiven.message}</p>
              )}
            </>
          )}
        </form>
      </Modal>

      <Modal
        open={Boolean(clientToDelete)}
        onClose={() => setClientToDelete(null)}
        title="Excluir cliente?"
        description="A ficha sai da sua lista. Atendimentos já lançados continuam no histórico."
        footer={
          <>
            <Button variant="ghost" onClick={() => setClientToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              isLoading={removeClient.isPending}
              onClick={() => {
                if (!clientToDelete) return;
                void removeClient.mutateAsync(clientToDelete.id).catch((error: unknown) => {
                  showToast({
                    tone: 'danger',
                    title: 'Não foi possível excluir',
                    description: errorMessage(error),
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
          {clientToDelete ? (
            <>
              <span className="font-semibold">{clientToDelete.name}</span> não aparece mais para
              novos agendamentos.
            </>
          ) : null}
        </p>
      </Modal>

      <Modal
        open={serviceOpen}
        onClose={closeServiceModal}
        title={editingService ? 'Editar serviço' : 'Novo serviço'}
        description="Duração e valor são usados na agenda. O preço é em reais, guardado em centavos."
        footer={
          <>
            <Button variant="ghost" onClick={closeServiceModal}>
              Cancelar
            </Button>
            <Button type="submit" form="service-form" isLoading={saveService.isPending}>
              Salvar
            </Button>
          </>
        }
      >
        <form
          id="service-form"
          className="flex flex-col gap-4"
          onSubmit={serviceForm.handleSubmit(async (values) => {
            try {
              await saveService.mutateAsync(values);
            } catch (error) {
              showToast({
                tone: 'danger',
                title: 'Não foi possível salvar o serviço',
                description: errorMessage(error),
              });
            }
          })}
        >
          <Field label="Nome" required error={serviceForm.formState.errors.name?.message}>
            {(props) => <Input {...props} {...serviceForm.register('name')} />}
          </Field>
          <Field label="Categoria" required error={serviceForm.formState.errors.category?.message}>
            {(props) => <Input {...props} {...serviceForm.register('category')} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Duração (minutos)"
              required
              error={serviceForm.formState.errors.durationMinutes?.message}
            >
              {(props) => (
                <Input {...props} type="number" min={5} step={5} {...serviceForm.register('durationMinutes')} />
              )}
            </Field>
            <Field
              label="Intervalo depois (min)"
              error={serviceForm.formState.errors.bufferAfterMinutes?.message}
            >
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min={0}
                  step={5}
                  {...serviceForm.register('bufferAfterMinutes')}
                />
              )}
            </Field>
          </div>
          <Field
            label="Valor"
            required
            hint="Ex.: 89,90"
            error={serviceForm.formState.errors.priceLabel?.message}
          >
            {(props) => <Input {...props} inputMode="decimal" {...serviceForm.register('priceLabel')} />}
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(serviceToDelete)}
        onClose={() => setServiceToDelete(null)}
        title="Excluir serviço?"
        description="Ele some da agenda e do site. Atendimentos já marcados não são apagados."
        footer={
          <>
            <Button variant="ghost" onClick={() => setServiceToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              isLoading={removeService.isPending}
              onClick={() => {
                if (!serviceToDelete) return;
                void removeService.mutateAsync(serviceToDelete.id).catch((error: unknown) => {
                  showToast({
                    tone: 'danger',
                    title: 'Não foi possível excluir',
                    description: errorMessage(error),
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
          {serviceToDelete ? (
            <>
              <span className="font-semibold">{serviceToDelete.name}</span> deixa de aparecer para
              novas marcações.
            </>
          ) : null}
        </p>
      </Modal>
    </div>
  );
}
