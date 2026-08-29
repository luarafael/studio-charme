import type { Notification, PrismaClient } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import {
  buildBookingRequestNotification,
  notificationTypeSchema,
  type NotificationDto,
  type NotificationListDto,
  type PushSubscribeBody,
} from '@studio-charme/contracts';
import { notFound } from '../../lib/errors.js';
import { sendPushToProfessional } from '../../lib/push.js';

export function toNotificationDto(record: Notification): NotificationDto | null {
  const type = notificationTypeSchema.safeParse(record.type);
  if (!type.success) return null;
  return {
    id: record.id,
    type: type.data,
    title: record.title,
    body: record.body,
    href: record.href,
    appointmentId: record.appointmentId,
    readAt: record.readAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function listNotifications(
  prisma: PrismaClient,
  professionalId: string,
): Promise<NotificationListDto> {
  const [records, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { professionalId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.notification.count({
      where: { professionalId, readAt: null },
    }),
  ]);

  return {
    unreadCount,
    items: records.map(toNotificationDto).filter((item): item is NotificationDto => item !== null),
  };
}

export async function markNotificationRead(
  prisma: PrismaClient,
  professionalId: string,
  id: string,
): Promise<void> {
  const record = await prisma.notification.findFirst({
    where: { id, professionalId },
    select: { id: true },
  });
  if (!record) throw notFound();

  await prisma.notification.updateMany({
    where: { id: record.id, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(
  prisma: PrismaClient,
  professionalId: string,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { professionalId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function upsertPushSubscription(
  prisma: PrismaClient,
  professionalId: string,
  body: PushSubscribeBody,
  userAgent?: string,
): Promise<void> {
  const trimmedAgent = userAgent?.slice(0, 300) || null;
  await prisma.pushDevice.upsert({
    where: { endpoint: body.endpoint },
    create: {
      professionalId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: trimmedAgent,
    },
    update: {
      professionalId,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: trimmedAgent,
    },
  });
}

export async function deletePushSubscription(
  prisma: PrismaClient,
  professionalId: string,
  endpoint: string,
): Promise<void> {
  await prisma.pushDevice.deleteMany({
    where: { professionalId, endpoint },
  });
}

/**
 * Grava o alerta do sino e tenta o push. Erro aqui nunca deve falhar o pedido
 * público: a cliente já tem o horário pendente na agenda.
 */
export async function notifyBookingRequest(
  prisma: PrismaClient,
  request: FastifyRequest,
  input: {
    professionalId: string;
    appointmentId: string;
    clientName: string;
    serviceName: string;
    startsAt: Date;
  },
): Promise<void> {
  try {
    const copy = buildBookingRequestNotification({
      clientName: input.clientName,
      serviceName: input.serviceName,
      startsAt: input.startsAt,
    });

    await prisma.notification.create({
      data: {
        professionalId: input.professionalId,
        appointmentId: input.appointmentId,
        type: copy.type,
        title: copy.title,
        body: copy.body,
        href: copy.href,
      },
    });

    await sendPushToProfessional(
      prisma,
      input.professionalId,
      { title: copy.title, body: copy.body, href: copy.href },
      request.log,
    );
  } catch (error) {
    request.log.error({ err: error }, 'falha ao registrar alerta de agendamento');
  }
}
