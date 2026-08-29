import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  PAYMENT_METHOD_LABELS,
  createPaymentBodySchema,
  formatCents,
  parseCurrencyToCents,
  toZonedIsoDate,
  type AppointmentDto,
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

const paymentFormSchema = createPaymentBodySchema
  .omit({ amountCents: true, discountCents: true, appointmentId: true, clientId: true })
  .extend({
    amountLabel: z.string().min(1, 'Informe o valor recebido.'),
    discountLabel: z.string().optional(),
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
    };
  });

type PaymentFormInput = z.input<typeof paymentFormSchema>;
type PaymentFormOutput = z.output<typeof paymentFormSchema>;

type PaymentComposerProps = {
  open: boolean;
  onClose: () => void;
  appointment?: Pick<AppointmentDto, 'id' | 'totalPriceCents' | 'client'>;
};

export function PaymentComposer({ open, onClose, appointment }: PaymentComposerProps) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const today = toZonedIsoDate(new Date());
  const suggested = appointment ? formatCents(appointment.totalPriceCents).replace(/[^\d,]/g, '') : '';

  const form = useForm<PaymentFormInput, unknown, PaymentFormOutput>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amountLabel: suggested,
      discountLabel: '',
      method: 'PIX',
      paidOn: today,
      notes: '',
    },
  });

  const create = useMutation({
    mutationFn: (body: PaymentFormOutput) =>
      api<PaymentDto>('/payments', {
        method: 'POST',
        body: {
          ...body,
          appointmentId: appointment?.id,
          clientId: appointment?.client.id,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar recebimento"
      description={
        appointment
          ? `Atendimento de ${appointment.client.name}. O valor não pode passar do combinado.`
          : 'Entra só no seu financeiro. Nenhuma outra profissional vê este lançamento.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="payment-composer" isLoading={form.formState.isSubmitting}>
            Salvar recebimento
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
            await create.mutateAsync(values);
          } catch (error) {
            if (error instanceof ApiClientError && error.code === 'PAYMENT_EXCEEDS_TOTAL') {
              setFormError('Este valor ultrapassa o que ainda falta receber neste atendimento.');
              return;
            }
            setFormError(error instanceof ApiClientError ? error.message : 'Não foi possível salvar.');
          }
        })}
      >
        <Field label="Valor recebido" required error={form.formState.errors.amountLabel?.message} hint="Ex.: 89,90">
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
        <Field label="Data" required error={form.formState.errors.paidOn?.message}>
          {(props) => <Input {...props} type="date" {...form.register('paidOn')} />}
        </Field>
        <Field label="Observação" error={form.formState.errors.notes?.message}>
          {(props) => <Textarea {...props} {...form.register('notes')} />}
        </Field>
      </form>
    </Modal>
  );
}
