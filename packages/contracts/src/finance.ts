import { z } from 'zod';
import { isoDateSchema } from './datetime.js';
import { uuidSchema } from './agenda.js';
import { paymentMethodSchema, paymentStatusSchema, expenseStatusSchema } from './enums.js';
import { centsSchema } from './money.js';
import type { PaymentStatus } from './enums.js';

const COUNTED_PAYMENT_STATUSES: readonly PaymentStatus[] = ['PAID', 'PARTIAL'];

export function netPaymentCents(amountCents: number, discountCents: number): number {
  return amountCents - discountCents;
}

export function paidTowardAppointmentCents(
  payments: readonly { amountCents: number; discountCents: number; status: PaymentStatus }[],
): number {
  return payments
    .filter((payment) => (COUNTED_PAYMENT_STATUSES as readonly string[]).includes(payment.status))
    .reduce((sum, payment) => sum + netPaymentCents(payment.amountCents, payment.discountCents), 0);
}

export function remainingDueCents(
  totalPriceCents: number,
  payments: readonly { amountCents: number; discountCents: number; status: PaymentStatus }[],
): number {
  return Math.max(0, totalPriceCents - paidTowardAppointmentCents(payments));
}

export function paymentExceedsDue(
  totalPriceCents: number,
  alreadyPaidCents: number,
  incomingNetCents: number,
): boolean {
  return alreadyPaidCents + incomingNetCents > totalPriceCents;
}

export const listFinanceQuerySchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
});
export type ListFinanceQuery = z.infer<typeof listFinanceQuerySchema>;

export const createPaymentBodySchema = z
  .object({
    appointmentId: uuidSchema.optional(),
    clientId: uuidSchema.optional(),
    amountCents: centsSchema,
    discountCents: centsSchema.default(0),
    method: paymentMethodSchema,
    paidOn: isoDateSchema,
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.discountCents <= data.amountCents, {
    path: ['discountCents'],
    message: 'O desconto não pode ser maior que o valor recebido.',
  });
export type CreatePaymentBody = z.infer<typeof createPaymentBodySchema>;

export const paymentSchema = z.object({
  id: uuidSchema,
  appointmentId: uuidSchema.nullable(),
  clientId: uuidSchema.nullable(),
  clientName: z.string().nullable(),
  amountCents: z.number().int(),
  discountCents: z.number().int(),
  netCents: z.number().int(),
  method: paymentMethodSchema,
  status: paymentStatusSchema,
  paidOn: isoDateSchema,
  notes: z.string().nullable(),
});
export type PaymentDto = z.infer<typeof paymentSchema>;

export const createExpenseBodySchema = z.object({
  description: z.string().trim().min(2, 'Descreva a despesa.').max(200),
  category: z.string().trim().min(2, 'Informe a categoria.').max(60),
  amountCents: centsSchema,
  incurredOn: isoDateSchema,
  dueOn: isoDateSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateExpenseBody = z.infer<typeof createExpenseBodySchema>;

export const expenseSchema = z.object({
  id: uuidSchema,
  description: z.string(),
  category: z.string(),
  amountCents: z.number().int(),
  status: expenseStatusSchema,
  incurredOn: isoDateSchema,
  dueOn: isoDateSchema.nullable(),
  notes: z.string().nullable(),
});
export type ExpenseDto = z.infer<typeof expenseSchema>;
