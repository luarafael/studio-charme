import type { PrismaClient } from '@prisma/client';
import type {
  AuthenticatedProfessional,
  UpdateProfilePhotoBody,
} from '@studio-charme/contracts';
import type { FastifyRequest } from 'fastify';
import { notFound } from '../../lib/errors.js';
import { AUDIT_ACTIONS, recordAudit } from '../../lib/audit.js';
import { decodeUploadedImage } from '../../lib/image.js';
import { toAuthenticatedProfessional } from '../auth/professional.js';

export async function getPublicProfessionalPhoto(
  prisma: PrismaClient,
  slug: string,
): Promise<{ bytes: Buffer; mime: string; updatedAt: Date }> {
  const professional = await prisma.professional.findFirst({
    where: { slug, isActive: true },
    select: { photoBytes: true, photoMime: true, photoUpdatedAt: true },
  });

  if (
    !professional?.photoBytes ||
    professional.photoBytes.length === 0 ||
    !professional.photoMime ||
    !professional.photoUpdatedAt
  ) {
    throw notFound();
  }

  return {
    bytes: Buffer.from(professional.photoBytes),
    mime: professional.photoMime,
    updatedAt: professional.photoUpdatedAt,
  };
}

async function loadAuthenticated(
  prisma: PrismaClient,
  professionalId: string,
): Promise<AuthenticatedProfessional> {
  const row = await prisma.professional.findUniqueOrThrow({
    where: { id: professionalId },
    select: {
      id: true,
      slug: true,
      name: true,
      email: true,
      role: true,
      photoUrl: true,
    },
  });
  return toAuthenticatedProfessional(row);
}

export async function updateOwnPhoto(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
  body: UpdateProfilePhotoBody,
): Promise<AuthenticatedProfessional> {
  const { bytes, mime } = decodeUploadedImage(body.imageBase64, body.mimeType);
  const current = await prisma.professional.findUniqueOrThrow({
    where: { id: professionalId },
    select: { slug: true },
  });
  const photoUpdatedAt = new Date();

  await prisma.professional.update({
    where: { id: professionalId },
    data: {
      photoBytes: bytes,
      photoMime: mime,
      photoUpdatedAt,
      photoUrl: `/public/professionals/${current.slug}/photo?v=${photoUpdatedAt.toISOString()}`,
    },
  });

  await recordAudit(prisma, request, {
    action: AUDIT_ACTIONS.PROFILE_PHOTO_UPDATED,
    entity: 'professional',
    entityId: professionalId,
    professionalId,
    metadata: { mime, bytes: bytes.length },
  });

  return loadAuthenticated(prisma, professionalId);
}

export async function removeOwnPhoto(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
): Promise<AuthenticatedProfessional> {
  await prisma.professional.update({
    where: { id: professionalId },
    data: {
      photoBytes: null,
      photoMime: null,
      photoUpdatedAt: null,
      photoUrl: null,
    },
  });

  await recordAudit(prisma, request, {
    action: AUDIT_ACTIONS.PROFILE_PHOTO_REMOVED,
    entity: 'professional',
    entityId: professionalId,
    professionalId,
  });

  return loadAuthenticated(prisma, professionalId);
}
