import { z } from 'zod';
import { uuidSchema } from './agenda.js';
import { toZonedIsoDate, toZonedTimeOfDay } from './datetime.js';

export const notificationTypeSchema = z.enum(['BOOKING_REQUEST']);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSchema = z.object({
  id: uuidSchema,
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string(),
  href: z.string(),
  appointmentId: uuidSchema.nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type NotificationDto = z.infer<typeof notificationSchema>;

export const notificationListSchema = z.object({
  unreadCount: z.number().int().min(0),
  items: z.array(notificationSchema),
});
export type NotificationListDto = z.infer<typeof notificationListSchema>;

export const vapidPublicKeySchema = z.object({
  enabled: z.boolean(),
  publicKey: z.string().nullable(),
});
export type VapidPublicKeyDto = z.infer<typeof vapidPublicKeySchema>;

export const pushSubscribeBodySchema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(20).max(255),
    auth: z.string().min(8).max(255),
  }),
});
export type PushSubscribeBody = z.infer<typeof pushSubscribeBodySchema>;

export const pushUnsubscribeBodySchema = z.object({
  endpoint: z.url(),
});

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

/** Texto do alerta interno (e do push) quando chega um pedido pelo site. */
export function buildBookingRequestNotification(input: {
  clientName: string;
  serviceName: string;
  startsAt: Date;
}): { type: NotificationType; title: string; body: string; href: string } {
  const date = toZonedIsoDate(input.startsAt);
  const time = toZonedTimeOfDay(input.startsAt);
  const [, month, day] = date.split('-') as [string, string, string];
  return {
    type: 'BOOKING_REQUEST',
    title: 'Novo pedido de agendamento',
    body: clip(`${input.clientName} pediu ${input.serviceName} em ${day}/${month} às ${time}.`, 500),
    href: `/app/agenda?date=${date}`,
  };
}

/** Só caminhos internos da área logada, para o clique no sino não sair do app. */
export function safeNotificationHref(href: string): string {
  return href.startsWith('/app/') ? href : '/app/agenda';
}
