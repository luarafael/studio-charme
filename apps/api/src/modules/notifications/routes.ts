import { z } from 'zod';
import {
  notificationListSchema,
  pushSubscribeBodySchema,
  pushUnsubscribeBodySchema,
  uuidSchema,
  vapidPublicKeySchema,
} from '@studio-charme/contracts';
import type { AppInstance } from '../../types/app.js';
import { getScopedProfessionalId } from '../../lib/scope.js';
import { getVapidPublicKey, isPushConfigured } from '../../lib/push.js';
import {
  deletePushSubscription,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  upsertPushSubscription,
} from './service.js';

export async function notificationRoutes(app: AppInstance): Promise<void> {
  app.get(
    '/notifications',
    {
      preHandler: app.requireAuth,
      schema: { response: { 200: notificationListSchema } },
    },
    async (request) => listNotifications(app.prisma, getScopedProfessionalId(request)),
  );

  app.post(
    '/notifications/:id/read',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: { params: z.object({ id: uuidSchema }) },
    },
    async (request, reply) => {
      await markNotificationRead(app.prisma, getScopedProfessionalId(request), request.params.id);
      return reply.status(204).send();
    },
  );

  app.post(
    '/notifications/read-all',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: {},
    },
    async (request, reply) => {
      await markAllNotificationsRead(app.prisma, getScopedProfessionalId(request));
      return reply.status(204).send();
    },
  );

  app.get(
    '/notifications/push/public-key',
    {
      preHandler: app.requireAuth,
      schema: { response: { 200: vapidPublicKeySchema } },
    },
    async () => ({
      enabled: isPushConfigured(),
      publicKey: getVapidPublicKey(),
    }),
  );

  app.post(
    '/notifications/push/subscribe',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: { body: pushSubscribeBodySchema },
    },
    async (request, reply) => {
      await upsertPushSubscription(
        app.prisma,
        getScopedProfessionalId(request),
        request.body,
        request.headers['user-agent'],
      );
      return reply.status(204).send();
    },
  );

  app.delete(
    '/notifications/push/subscribe',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: { body: pushUnsubscribeBodySchema },
    },
    async (request, reply) => {
      await deletePushSubscription(
        app.prisma,
        getScopedProfessionalId(request),
        request.body.endpoint,
      );
      return reply.status(204).send();
    },
  );
}
