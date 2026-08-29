import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  PAYMENT_METHOD_LABELS,
  formatCents,
  isoDateSchema,
  parseCurrencyToCents,
  paymentMethodSchema,
  toZonedIsoDate,
  type AppointmentDto,
  type ClientDto,
  type PaymentDto,
  type PaymentMethod,
} from '@studio-charme/contracts';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { api, ApiClientError } from '@/lib/api';

function centsToInputLabel(cents: number): string {
  return formatCents(cents).replace(/[^\d,]/g, '');
}

const paymentFormSchema = z
  .object({
    amountLabel: z.string().min(1, 'Informe o valor.'),
    discountLabel: z.string().optional(),
    method: paymentMethodSchema,
    paidOn: isoDateSchema,
    notes: z.string().trim().max(2000).optional(),
    clientId: z.string().optional(),
    kind: z.enum(['received', 'receivable']),
  })
  .transform((data, ctx) => {
    const amountCents = parseCurrencyToCents(data.amountLabel);
    if (amountCents === null || amountCents < 0) {
      ctx.addIssue({ code: 'custom', path: ['amountLabel'], message: 'Informe um valor em reais.' });
      return z.NEVER;
    }
    const discountCents =
      data.discountLabel && data.discountLabel.trim() !== ''
        ? parseCurrencyToCents(data.discountLabel)
        : 0;
    if (discountCents === null || discountCents < 0) {
      ctx.addIssue({ code: 'custom', path: ['discountLabel'], message: 'Informe um desconto válido.' });
      return z.NEVER;
    }
    if (discountCents > amountCents) {
      ctx.addIssue({
        code: 'custom',
        path: ['discountLabel'],
        message: 'O desconto não pode ser maior que o valor recebido.',
      });
      return z.NEVER;
    }
    return {
      amountCents,
      discountCents,
      method: data.method,
      paidOn: data.paidOn,
      notes: data.notes,
      clientId: data.clientId || undefined,
      status: data.kind === 'receivable' ? ('PENDING' as const) : ('PAID' as const),
    };
  });

type PaymentFormInput = z.input<typeof paymentFormSchema>;
type PaymentFormOutput = z.output<typeof paymentFormSchema>;

type PaymentComposerProps = {
  open: boolean;
  onClose: () => void;
  appointment?: Pick<AppointmentDto, 'id' | 'totalPriceCents' | 'client'>;
  payment?: PaymentDto;
  intent?: 'received' | 'receivable';
};

export function PaymentComposer({
  open,
  onClose,
  appointment,
  payment,
  intent = 'received',
}: PaymentComposerProps) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const today = toZonedIsoDate(new Date());
  const editing = payment !== undefined;
  const initialKind: 'received' | 'receivable' =
    payment?.status === 'PENDING' ? 'receivable' : intent;
  const suggested = appointment
    ? centsToInputLabel(appointment.totalPriceCents)
    : payment
      ? centsToInputLabel(payment.amountCents)
      : '';

  const clients = useQuery({
    queryKey: ['clients'],
    queryFn: () => api<{ items: ClientDto[] }>('/clients'),
    enabled: open && !appointment,
  });

  const form = useForm<PaymentFormInput, unknown, PaymentFormOutput>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amountLabel: suggested,
      discountLabel: payment && payment.discountCents > 0 ? centsToInputLabel(payment.discountCents) : '',
      method: payment?.method ?? 'PIX',
      paidOn: payment?.paidOn ?? today,
      notes: payment?.notes ?? '',
      clientId: payment?.clientId ?? appointment?.client.id ?? '',
      kind: initialKind,
    },
  });

  const kind = form.watch('kind');

  const save = useMutation({
    mutationFn: (body: PaymentFormOutput) => {
      const clientId = appointment?.client.id ?? body.clientId;
      const payload = {
        amountCents: body.amountCents,
        discountCents: body.discountCents,
        method: body.method,
        paidOn: body.paidOn,
        notes: body.notes,
        status: body.status,
        ...(appointment && !editing ? { appointmentId: appointment.id } : {}),
      };
      if (editing) {
        return api<PaymentDto>(`/payments/${payment.id}`, {
          method: 'PATCH',
          body: { ...payload, clientId: clientId || null },
        });
      }
      return api<PaymentDto>('/payments', {
        method: 'POST',
        body: { ...payload, ...(clientId ? { clientId } : {}) },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      onClose();
    },
  });

  const isReceivable = kind === 'receivable';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        editing
          ? isReceivable
            ? 'Editar a receber'
            : 'Editar recebimento'
          : isReceivable
            ? 'Registrar a receber'
            : 'Registrar recebimento'
      }
      description={
        appointment
          ? `Atendimento de ${appointment.client.name}. O valor não pode passar do combinado.`
          : isReceivable
            ? 'Valor que ainda vai entrar. Aparece no A receber do painel e do financeiro.'
            : 'Entra só no seu financeiro. Nenhuma outra profissional vê este lançamento.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="payment-composer" isLoading={form.formState.isSubmitting}>
            Salvar
          </Button>
        </>
      }
    >
      {formError && (
        <Alert tone="danger" className="mb-4">
          {formError}
        </Alert>
      )}
      <form
        id="payment-composer"
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          setFormError(null);
          try {
            await save.mutateAsync(values);
          } catch (error) {
            if (error instanceof ApiClientError && error.code === 'PAYMENT_EXCEEDS_TOTAL') {
              setFormError('Este valor ultrapassa o que ainda falta receber neste atendimento.');
              return;
            }
            setFormError(error instanceof ApiClientError ? error.message : 'Não foi possível salvar.');
          }
        })}
      >
        {!appointment && (
          <Field label="Situação" required>
            {(props) => (
              <Select {...props} {...form.register('kind')}>
                <option value="receivable">A receber</option>
                <option value="received">Já recebido</option>
              </Select>
            )}
          </Field>
        )}
        {!appointment && (
          <Field label="Cliente" hint="Opcional em lançamento avulso.">
            {(props) => (
              <Select {...props} {...form.register('clientId')}>
                <option value="">Sem cliente</option>
                {(clients.data?.items ?? []).map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field
          label={isReceivable ? 'Valor a receber' : 'Valor recebido'}
          required
          error={form.formState.errors.amountLabel?.message}
          hint="Ex.: 89,90"
        >
          {(props) => <Input {...props} inputMode="decimal" {...form.register('amountLabel')} />}
        </Field>
        <Field label="Desconto" error={form.formState.errors.discountLabel?.message}>
          {(props) => <Input {...props} inputMode="decimal" {...form.register('discountLabel')} />}
        </Field>
        <Field label="Forma" required error={form.formState.errors.method?.message}>
          {(props) => (
            <Select {...props} {...form.register('method')}>
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label={isReceivable ? 'Data prevista' : 'Data'}
          required
          error={form.formState.errors.paidOn?.message}
        >
          {(props) => <Input {...props} type="date" {...form.register('paidOn')} />}
        </Field>
        <Field label="Observação" error={form.formState.errors.notes?.message}>
          {(props) => <Textarea {...props} {...form.register('notes')} />}
        </Field>
      </form>
    </Modal>
  );
}
