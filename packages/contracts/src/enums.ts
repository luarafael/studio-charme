import { z } from 'zod';

export const roleSchema = z.enum(['PROFESSIONAL', 'ADMIN']);
export type Role = z.infer<typeof roleSchema>;

export const appointmentStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const appointmentSourceSchema = z.enum(['WEBSITE', 'WHATSAPP', 'WALK_IN', 'INTERNAL']);
export type AppointmentSource = z.infer<typeof appointmentSourceSchema>;

export const paymentMethodSchema = z.enum(['CASH', 'PIX', 'DEBIT', 'CREDIT', 'OTHER']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentStatusSchema = z.enum(['PENDING', 'PAID', 'PARTIAL', 'REFUNDED']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const expenseStatusSchema = z.enum(['PENDING', 'PAID', 'CANCELLED']);
export type ExpenseStatus = z.infer<typeof expenseStatusSchema>;

export const availabilityTypeSchema = z.enum(['EXTRA', 'TIME_OFF', 'BREAK', 'BLOCK']);
export type AvailabilityType = z.infer<typeof availabilityTypeSchema>;

/** Rótulos em pt-BR para exibição na interface. */
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Aguardando confirmação',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em atendimento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
};

export const APPOINTMENT_SOURCE_LABELS: Record<AppointmentSource, string> = {
  WEBSITE: 'Site',
  WHATSAPP: 'WhatsApp',
  WALK_IN: 'Presencial',
  INTERNAL: 'Cadastro interno',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Dinheiro',
  PIX: 'Pix',
  DEBIT: 'Cartão de débito',
  CREDIT: 'Cartão de crédito',
  OTHER: 'Outro',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  PARTIAL: 'Parcial',
  REFUNDED: 'Estornado',
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  PENDING: 'A pagar',
  PAID: 'Paga',
  CANCELLED: 'Cancelada',
};

export const AVAILABILITY_TYPE_LABELS: Record<AvailabilityType, string> = {
  EXTRA: 'Disponibilidade extra',
  TIME_OFF: 'Folga',
  BREAK: 'Intervalo',
  BLOCK: 'Bloqueio',
};

/** Status que ocupam a agenda e por isso geram conflito de horário. */
export const BLOCKING_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
];

/** Status que encerram o atendimento sem gerar receita. */
export const RELEASING_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  'CANCELLED',
  'NO_SHOW',
];
