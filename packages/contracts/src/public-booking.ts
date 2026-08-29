import { z } from 'zod';
import { isoDateSchema, timeOfDaySchema } from './datetime.js';
import { brazilianPhoneSchema } from './phone.js';
import { uuidSchema } from './agenda.js';

export const createPublicBookingBodySchema = z.object({
  professionalSlug: z.string().trim().min(2).max(40),
  serviceId: uuidSchema,
  date: isoDateSchema,
  time: timeOfDaySchema,
  clientName: z.string().trim().min(2, 'Informe seu nome.').max(120),
  clientPhone: brazilianPhoneSchema,
  notes: z.string().trim().max(500).optional(),
  consent: z.boolean().refine((value) => value, {
    message: 'É necessário concordar com o uso dos seus dados para o contato.',
  }),
});
export type CreatePublicBookingBody = z.infer<typeof createPublicBookingBodySchema>;

export const publicBookingResponseSchema = z.object({
  status: z.literal('PENDING'),
  professionalName: z.string(),
  serviceName: z.string(),
  date: isoDateSchema,
  time: timeOfDaySchema,
  whatsapp: z.string(),
});
export type PublicBookingResponse = z.infer<typeof publicBookingResponseSchema>;
