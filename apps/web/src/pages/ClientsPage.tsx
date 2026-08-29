import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  createClientBodySchema,
  createServiceBodySchema,
  formatBrazilianPhone,
  formatCents,
  maskBrazilianPhone,
  parseCurrencyToCents,
  type ClientDto,
  type ServiceDto,
} from '@studio-charme/contracts';
import { Plus } from 'lucide-react';
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

export default function ClientsPage() {
  useDocumentMeta({
    title: `Clientes | ${siteConfig.name}`,
    noIndex: true,
  });

  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [clientOpen, setClientOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
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

  const serviceForm = useForm<ServiceFormInput, unknown, z.output<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      category: 'Geral',
      durationMinutes: 60,
      bufferAfterMinutes: 0,
      priceLabel: '',
    },
  });

  const createClient = useMutation({
    mutationFn: (body: z.output<typeof clientFormSchema>) => api<ClientDto>('/clients', { method: 'POST', body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      showToast({ tone: 'success', title: 'Cliente cadastrada' });
      setClientOpen(false);
      clientForm.reset();
      setPhoneMask('');
    },
  });

  const createService = useMutation({
    mutationFn: (body: z.output<typeof createServiceBodySchema>) =>
      api<ServiceDto>('/services', { method: 'POST', body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      showToast({ tone: 'success', title: 'Serviço cadastrado' });
      setServiceOpen(false);
      serviceForm.reset({
        name: '',
        category: 'Geral',
        durationMinutes: 60,
        bufferAfterMinutes: 0,
        priceLabel: '',
      });
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
          <Button leadingIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setClientOpen(true)}>
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
              <Button variant="secondary" onClick={() => setClientOpen(true)}>
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
            onClick={() => setServiceOpen(true)}
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
              <Button variant="secondary" onClick={() => setServiceOpen(true)}>
                Cadastrar serviço
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {services.data!.items.map((service) => (
              <li
                key={service.id}
                className="rounded-card border-brown-100 flex items-center justify-between gap-4 border bg-white px-4 py-3"
              >
                <div>
                  <p className="text-brown-900 font-medium">{service.name}</p>
                  <p className="text-brown-500 text-sm">
                    {service.category} · {service.durationMinutes} min
                  </p>
                </div>
                <p className="text-brown-900 font-semibold">{formatCents(service.priceCents)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={clientOpen}
        onClose={() => setClientOpen(false)}
        title="Nova cliente"
        description="O contato fica só na sua lista."
        footer={
          <>
            <Button variant="ghost" onClick={() => setClientOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="new-client"
              isLoading={clientForm.formState.isSubmitting}
            >
              Salvar
            </Button>
          </>
        }
      >
        <form
          id="new-client"
          className="flex flex-col gap-4"
          onSubmit={clientForm.handleSubmit(async (values) => {
            try {
              await createClient.mutateAsync(values);
            } catch (error) {
              showToast({
                tone: 'danger',
                title: 'Não foi possível cadastrar',
                description:
                  error instanceof ApiClientError ? error.message : 'Confira os dados e tente de novo.',
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
        </form>
      </Modal>

      <Modal
        open={serviceOpen}
        onClose={() => setServiceOpen(false)}
        title="Novo serviço"
        description="Duração e valor são usados na agenda. O preço é em reais, guardado em centavos."
        footer={
          <>
            <Button variant="ghost" onClick={() => setServiceOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="new-service" isLoading={serviceForm.formState.isSubmitting}>
              Salvar
            </Button>
          </>
        }
      >
        <form
          id="new-service"
          className="flex flex-col gap-4"
          onSubmit={serviceForm.handleSubmit(async (values) => {
            try {
              await createService.mutateAsync(values);
            } catch (error) {
              showToast({
                tone: 'danger',
                title: 'Não foi possível cadastrar o serviço',
                description:
                  error instanceof ApiClientError ? error.message : 'Confira os dados e tente de novo.',
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
    </div>
  );
}
