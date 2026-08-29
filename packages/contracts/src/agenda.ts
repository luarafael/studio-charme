import { z } from 'zod';
import { isoDateSchema, timeOfDaySchema } from './datetime.js';
import {
  appointmentSourceSchema,
  appointmentStatusSchema,
  paymentMethodSchema,
  paymentStatusSchema,
} from './enums.js';
import { brazilianPhoneSchema } from './phone.js';

export const uuidSchema = z.uuid('Identificador inválido.');

export const appointmentServiceSnapshotSchema = z.object({
  serviceId: uuidSchema,
  name: z.string(),
  durationMinutes: z.number().int(),
  priceCents: z.number().int(),
});

export const appointmentClientSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  phone: z.string(),
});

export const appointmentSchema = z.object({
  id: uuidSchema,
  status: appointmentStatusSchema,
  source: appointmentSourceSchema,
  startsAt: z.string(),
  endsAt: z.string(),
  blockedUntil: z.string(),
  totalPriceCents: z.number().int(),
  notes: z.string().nullable(),
  clientNotes: z.string().nullable(),
  client: appointmentClientSchema,
  services: z.array(appointmentServiceSnapshotSchema),
});
export type AppointmentDto = z.infer<typeof appointmentSchema>;

export const appointmentPaymentSnapshotSchema = z.object({
  id: uuidSchema,
  amountCents: z.number().int(),
  discountCents: z.number().int(),
  netCents: z.number().int(),
  method: paymentMethodSchema,
  status: paymentStatusSchema,
  paidOn: isoDateSchema,
});

export const appointmentDetailSchema = appointmentSchema.extend({
  payments: z.array(appointmentPaymentSnapshotSchema),
});
export type AppointmentDetailDto = z.infer<typeof appointmentDetailSchema>;

export const listAppointmentsQuerySchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
  status: appointmentStatusSchema.optional(),
  search: z.string().trim().max(120).optional(),
});
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;

export const listAppointmentHistoryQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});
export type ListAppointmentHistoryQuery = z.infer<typeof listAppointmentHistoryQuerySchema>;

export const createAppointmentBodySchema = z.object({
  clientId: uuidSchema,
  serviceIds: z.array(uuidSchema).min(1, 'Selecione ao menos um serviço.'),
  date: isoDateSchema,
  time: timeOfDaySchema,
  notes: z.string().trim().max(2000).optional(),
  source: appointmentSourceSchema.default('INTERNAL'),
});
export type CreateAppointmentBody = z.infer<typeof createAppointmentBodySchema>;

export const updateAppointmentStatusBodySchema = z.object({
  status: appointmentStatusSchema,
  cancelReason: z.string().trim().max(200).optional(),
});

export const createClientBodySchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da cliente.').max(160),
  phone: brazilianPhoneSchema,
  notes: z.string().trim().max(4000).optional(),
  consentGiven: z.boolean(),
});
export type CreateClientBody = z.infer<typeof createClientBodySchema>;

export const updateClientBodySchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da cliente.').max(160),
  phone: brazilianPhoneSchema,
  notes: z.string().trim().max(4000).optional(),
});
export type UpdateClientBody = z.infer<typeof updateClientBodySchema>;

export const clientSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  phone: z.string(),
  notes: z.string().nullable(),
  consentGivenAt: z.string().nullable(),
  isActive: z.boolean(),
});
export type ClientDto = z.infer<typeof clientSchema>;

export const listClientsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
});

export const createServiceBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(40),
  durationMinutes: z.number().int().min(5).max(12 * 60),
  priceCents: z.number().int().min(0),
  bufferAfterMinutes: z.number().int().min(0).max(120).default(0),
});
export type CreateServiceBody = z.infer<typeof createServiceBodySchema>;

export const updateServiceBodySchema = createServiceBodySchema;
export type UpdateServiceBody = CreateServiceBody;

export const serviceSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  category: z.string(),
  durationMinutes: z.number().int(),
  priceCents: z.number().int(),
  bufferAfterMinutes: z.number().int(),
  isActive: z.boolean(),
});
export type ServiceDto = z.infer<typeof serviceSchema>;

export const dashboardQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export const dashboardSchema = z.object({
  todayCount: z.number().int(),
  upcomingCount: z.number().int(),
  pendingCount: z.number().int(),
  cancelledCount: z.number().int(),
  noShowCount: z.number().int(),
  /** Recebido de fato (pagamentos com status pago), em centavos. */
  receivedCents: z.number().int(),
  /** Ainda a receber de atendimentos concluídos, em centavos. */
  pendingCents: z.number().int(),
  /** Ticket médio dos atendimentos concluídos no período, em centavos. */
  averageTicketCents: z.number().int(),
  expenseCents: z.number().int(),
  /** Recebido menos despesas do período. Não é lucro contábil. */
  balanceCents: z.number().int(),
  /** Comissão estimada sobre o recebido, em centavos. */
  estimatedCommissionCents: z.number().int(),
  clientsServed: z.number().int(),
  todayAppointments: z.array(appointmentSchema),
  upcomingAppointments: z.array(appointmentSchema),
});
export type DashboardDto = z.infer<typeof dashboardSchema>;
