import type { PrismaClient } from '@prisma/client';
import {
  computeAppointmentWindow,
  isAppointmentInPast,
  type CreatePublicBookingBody,
  type IsoDate,
  type PublicBookingResponse,
  type PublicCatalogDto,
} from '@studio-charme/contracts';
import type { FastifyRequest } from 'fastify';
import { AppError, notFound, scheduleConflict } from '../../lib/errors.js';
import { isAppointmentOverlapError } from '../../lib/prisma.js';
import { AUDIT_ACTIONS, recordAudit } from '../../lib/audit.js';
import { computeDaySlots } from '../availability/service.js';
import { notifyBookingRequest } from '../notifications/service.js';

async function findPublicProfessional(prisma: PrismaClient, slug: string) {
  const professional = await prisma.professional.findFirst({
    where: { slug, isActive: true, isPubliclyVisible: true },
    select: {
      id: true,
      slug: true,
      name: true,
      role: true,
      whatsapp: true,
    },
  });
  if (!professional) throw notFound();
  return professional;
}

export async function getPublicCatalog(prisma: PrismaClient): Promise<PublicCatalogDto> {
  const professionals = await prisma.professional.findMany({
    where: { isActive: true, isPubliclyVisible: true },
    select: {
      slug: true,
      name: true,
      role: true,
      services: {
        where: { isActive: true, isPubliclyVisible: true },
        select: { id: true, name: true, category: true, durationMinutes: true },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      },
      _count: { select: { businessHours: true } },
    },
    orderBy: { name: 'asc' },
  });

  return {
    professionals: professionals.map((item) => ({
      slug: item.slug,
      name: item.name,
      role: item.role,
      hasHours: item._count.businessHours > 0,
      services: item.services,
    })),
  };
}

export async function getPublicAvailability(
  prisma: PrismaClient,
  slug: string,
  date: IsoDate,
  serviceId: string,
) {
  const professional = await findPublicProfessional(prisma, slug);
  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      professionalId: professional.id,
      isActive: true,
      isPubliclyVisible: true,
    },
    select: { durationMinutes: true, bufferAfterMinutes: true },
  });
  if (!service) throw notFound();

  const { closed, slots } = await computeDaySlots(
    prisma,
    professional.id,
    date,
    service.durationMinutes,
    service.bufferAfterMinutes,
  );

  return {
    date,
    closed,
    slots: slots.filter((slot) => slot.available).map((slot) => ({ time: slot.time })),
  };
}

export async function createPublicBooking(
  prisma: PrismaClient,
  request: FastifyRequest,
  body: CreatePublicBookingBody,
): Promise<PublicBookingResponse> {
  const professional = await findPublicProfessional(prisma, body.professionalSlug);
  const service = await prisma.service.findFirst({
    where: {
      id: body.serviceId,
      professionalId: professional.id,
      isActive: true,
      isPubliclyVisible: true,
    },
  });
  if (!service) throw notFound();

  const { closed, slots } = await computeDaySlots(
    prisma,
    professional.id,
    body.date,
    service.durationMinutes,
    service.bufferAfterMinutes,
  );
  const chosen = slots.find((slot) => slot.time === body.time && slot.available);
  if (closed || !chosen) {
    throw scheduleConflict('Este horário não está mais disponível.');
  }

  const window = computeAppointmentWindow({
    date: body.date,
    time: body.time,
    durationMinutes: service.durationMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes,
  });
  if (isAppointmentInPast(window.startsAt)) {
    throw new AppError('VALIDATION_ERROR', 422, {
      message: 'Não é possível agendar um horário que já passou.',
    });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.client.findUnique({
        where: {
          professionalId_phone: { professionalId: professional.id, phone: body.clientPhone },
        },
        select: { id: true },
      });

      const client =
        existing ??
        (await tx.client.create({
          data: {
            professionalId: professional.id,
            name: body.clientName,
            phone: body.clientPhone,
            notes: body.notes,
            consentGivenAt: new Date(),
          },
          select: { id: true },
        }));

      if (existing) {
        await tx.client.update({
          where: { id: client.id },
          data: { name: body.clientName },
        });
      }

      return tx.appointment.create({
        data: {
          professionalId: professional.id,
          clientId: client.id,
          status: 'PENDING',
          source: 'WEBSITE',
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          blockedUntil: window.blockedUntil,
          totalPriceCents: service.priceCents,
          clientNotes: body.notes,
          services: {
            create: {
              serviceId: service.id,
              nameSnapshot: service.name,
              durationMinutes: service.durationMinutes,
              priceCents: service.priceCents,
            },
          },
        },
      });
    });

    await recordAudit(prisma, request, {
      action: AUDIT_ACTIONS.APPOINTMENT_CREATED,
      entity: 'appointment',
      entityId: created.id,
      professionalId: professional.id,
      metadata: { source: 'WEBSITE' },
    });

    await notifyBookingRequest(prisma, request, {
      professionalId: professional.id,
      appointmentId: created.id,
      clientName: body.clientName,
      serviceName: service.name,
      startsAt: window.startsAt,
    });
  } catch (error) {
    if (isAppointmentOverlapError(error)) {
      throw scheduleConflict('Este horário não está mais disponível.');
    }
    throw error;
  }

  return {
    status: 'PENDING',
    professionalName: professional.name,
    serviceName: service.name,
    date: body.date,
    time: body.time,
    whatsapp: professional.whatsapp ?? '',
  };
}
