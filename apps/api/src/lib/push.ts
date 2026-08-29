import type { FastifyBaseLogger } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import webPush from 'web-push';
import { getEnv } from '../config/env.js';

export function isPushConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string | null {
  return getEnv().VAPID_PUBLIC_KEY ?? null;
}

function ensureVapidConfigured(): boolean {
  const env = getEnv();
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  webPush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  return true;
}

function isExpiredEndpoint(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error.statusCode === 404 || error.statusCode === 410)
  );
}

/**
 * Entrega o mesmo aviso do sino no celular. Falha de um aparelho não impede os
 * demais; inscrição expirada é removida para não insistir em endpoint morto.
 */
export async function sendPushToProfessional(
  prisma: PrismaClient,
  professionalId: string,
  payload: { title: string; body: string; href: string },
  logger?: FastifyBaseLogger,
): Promise<void> {
  if (!ensureVapidConfigured()) return;

  const devices = await prisma.pushDevice.findMany({
    where: { professionalId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (devices.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    devices.map(async (device) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: device.endpoint,
            keys: { p256dh: device.p256dh, auth: device.auth },
          },
          body,
        );
      } catch (error) {
        if (isExpiredEndpoint(error)) {
          await prisma.pushDevice.deleteMany({ where: { id: device.id } });
          return;
        }
        logger?.warn({ err: error, professionalId }, 'falha ao enviar push para um aparelho');
      }
    }),
  );
}
