import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  isoDateSchema,
  parseCurrencyToCents,
  toZonedIsoDate,
  type ExpenseDto,
} from '@studio-charme/contracts';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { api, ApiClientError } from '@/lib/api';

const expenseFormSchema = z
  .object({
    description: z.string().trim().min(2, 'Descreva a despesa.').max(200),
    category: z.string().trim().min(2, 'Informe a categoria.').max(60),
    amountLabel: z.string().min(1, 'Informe o valor.'),
    incurredOn: isoDateSchema,
    dueOn: isoDateSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .transform((data, ctx) => {
    const amountCents = parseCurrencyToCents(data.amountLabel);
    if (amountCents === null || amountCents <= 0) {
      ctx.addIssue({ code: 'custom', path: ['amountLabel'], message: 'Informe um valor em reais.' });
      return z.NEVER;
    }
    return {
      description: data.description,
      category: data.category,
      amountCents,
      incurredOn: data.incurredOn,
      dueOn: data.dueOn,
      notes: data.notes,
    };
  });

type ExpenseFormInput = z.input<typeof expenseFormSchema>;
type ExpenseFormOutput = z.output<typeof expenseFormSchema>;

type ExpenseComposerProps = {
  open: boolean;
  onClose: () => void;
};

export function ExpenseComposer({ open, onClose }: ExpenseComposerProps) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const today = toZonedIsoDate(new Date());

  const form = useForm<ExpenseFormInput, unknown, ExpenseFormOutput>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: '',
      category: 'Produtos',
      amountLabel: '',
      incurredOn: today,
      notes: '',
    },
  });

  const create = useMutation({
    mutationFn: (body: ExpenseFormOutput) => api<ExpenseDto>('/expenses', { method: 'POST', body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar despesa"
      description="O gasto entra só no seu saldo do mês. Não é um lançamento contábil."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="expense-composer" isLoading={form.formState.isSubmitting}>
            Salvar despesa
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
        id="expense-composer"
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          setFormError(null);
          try {
            await create.mutateAsync(values);
          } catch (error) {
            setFormError(error instanceof ApiClientError ? error.message : 'Não foi possível salvar.');
          }
        })}
      >
        <Field label="Descrição" required error={form.formState.errors.description?.message}>
          {(props) => <Input {...props} {...form.register('description')} />}
        </Field>
        <Field
          label="Categoria"
          required
          hint="Ex.: Produtos, transporte, aluguel da cadeira."
          error={form.formState.errors.category?.message}
        >
          {(props) => <Input {...props} {...form.register('category')} />}
        </Field>
        <Field label="Valor" required hint="Ex.: 45,00" error={form.formState.errors.amountLabel?.message}>
          {(props) => <Input {...props} inputMode="decimal" {...form.register('amountLabel')} />}
        </Field>
        <Field label="Data" required error={form.formState.errors.incurredOn?.message}>
          {(props) => <Input {...props} type="date" {...form.register('incurredOn')} />}
        </Field>
        <Field label="Observação" error={form.formState.errors.notes?.message}>
          {(props) => <Textarea {...props} {...form.register('notes')} />}
        </Field>
      </form>
    </Modal>
  );
}
