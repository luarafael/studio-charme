import type { Appointment, AppointmentService, Client } from '@prisma/client';
import {
  appointmentSourceSchema,
  canTransitionAppointmentStatus,
  computeAppointmentWindow,
  isAppointmentInPast,
  type AppointmentDto,
  type AppointmentStatus,
  type CreateAppointmentBody,
} from '@studio-charme/contracts';
import { AppError, notFound, scheduleConflict } from '../../lib/errors.js';
import { isAppointmentOverlapError, isPrismaError, PRISMA_ERROR } from '../../lib/prisma.js';
import { AUDIT_ACTIONS, recordAudit } from '../../lib/audit.js';
import type { FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';

type AppointmentRecord = Appointment & {
  client: Pick<Client, 'id' | 'name' | 'phone'>;
  services: AppointmentService[];
};

export function toAppointmentDto(record: AppointmentRecord): AppointmentDto {
  return {
    id: record.id,
    status: record.status,
    source: record.source,
    startsAt: record.startsAt.toISOString(),
    endsAt: record.endsAt.toISOString(),
    blockedUntil: record.blockedUntil.toISOString(),
    totalPriceCents: record.totalPriceCents,
    notes: record.notes,
    clientNotes: record.clientNotes,
    client: {
      id: record.client.id,
      name: record.client.name,
      phone: record.client.phone,
    },
    services: record.services.map((item) => ({
      serviceId: item.serviceId,
      name: item.nameSnapshot,
      durationMinutes: item.durationMinutes,
      priceCents: item.priceCents,
    })),
  };
}

const appointmentInclude = {
  client: { select: { id: true, name: true, phone: true } },
  services: true,
} as const;

export async function listAppointments(
  prisma: PrismaClient,
  professionalId: string,
  query: { from: Date; to: Date; status?: AppointmentStatus; search?: string },
): Promise<AppointmentDto[]> {
  const records = await prisma.appointment.findMany({
    where: {
      professionalId,
      startsAt: { gte: query.from, lt: query.to },
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            client: {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search.replace(/\D/g, '') } },
              ],
            },
          }
        : {}),
    },
    include: appointmentInclude,
    orderBy: { startsAt: 'asc' },
  });

  return records.map(toAppointmentDto);
}

export async function getAppointment(
  prisma: PrismaClient,
  professionalId: string,
  id: string,
): Promise<AppointmentDto> {
  const record = await prisma.appointment.findFirst({
    where: { id, professionalId },
    include: appointmentInclude,
  });
  if (!record) throw notFound();
  return toAppointmentDto(record);
}

export async function createAppointment(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
  body: CreateAppointmentBody,
): Promise<AppointmentDto> {
  const client = await prisma.client.findFirst({
    where: { id: body.clientId, professionalId, isActive: true },
    select: { id: true },
  });
  if (!client) throw notFound();

  const services = await prisma.service.findMany({
    where: { id: { in: body.serviceIds }, professionalId, isActive: true },
  });
  if (services.length !== body.serviceIds.length) {
    throw notFound();
  }

  const durationMinutes = services.reduce((sum, service) => sum + service.durationMinutes, 0);
  const bufferAfterMinutes = Math.max(...services.map((service) => service.bufferAfterMinutes));
  const totalPriceCents = services.reduce((sum, service) => sum + service.priceCents, 0);
  const window = computeAppointmentWindow({
    date: body.date,
    time: body.time,
    durationMinutes,
    bufferAfterMinutes,
  });

  if (isAppointmentInPast(window.startsAt)) {
    throw new AppError('VALIDATION_ERROR', 422, {
      message: 'Não é possível agendar um horário que já passou.',
    });
  }

  const source = appointmentSourceSchema.parse(body.source ?? 'INTERNAL');

  try {
    const created = await prisma.appointment.create({
      data: {
        professionalId,
        clientId: client.id,
        status: source === 'INTERNAL' ? 'CONFIRMED' : 'PENDING',
        source,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        blockedUntil: window.blockedUntil,
        totalPriceCents,
        notes: body.notes,
        services: {
          create: services.map((service) => ({
            serviceId: service.id,
            nameSnapshot: service.name,
            durationMinutes: service.durationMinutes,
            priceCents: service.priceCents,
          })),
        },
      },
      include: appointmentInclude,
    });

    await recordAudit(prisma, request, {
      action: AUDIT_ACTIONS.APPOINTMENT_CREATED,
      entity: 'appointment',
      entityId: created.id,
      professionalId,
    });

    return toAppointmentDto(created);
  } catch (error) {
    if (isAppointmentOverlapError(error)) {
      throw scheduleConflict('Já existe um atendimento neste horário.');
    }
    throw error;
  }
}

export async function updateAppointmentStatus(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
  id: string,
  status: AppointmentStatus,
  cancelReason?: string,
): Promise<AppointmentDto> {
  const current = await prisma.appointment.findFirst({
    where: { id, professionalId },
    select: { id: true, status: true },
  });
  if (!current) throw notFound();

  if (!canTransitionAppointmentStatus(current.status, status)) {
    throw new AppError('CONFLICT', 409, {
      message: 'Esta alteração de status não é permitida para o atendimento atual.',
    });
  }

  if (status === 'CANCELLED' && !cancelReason) {
    throw new AppError('VALIDATION_ERROR', 422, {
      message: 'Informe o motivo do cancelamento.',
    });
  }

  const now = new Date();
  const updated = await prisma.appointment.update({
    where: { id: current.id },
    data: {
      status,
      cancelReason: status === 'CANCELLED' ? cancelReason : undefined,
      cancelledAt: status === 'CANCELLED' ? now : undefined,
      confirmedAt: status === 'CONFIRMED' ? now : undefined,
      completedAt: status === 'COMPLETED' ? now : undefined,
    },
    include: appointmentInclude,
  });

  await recordAudit(prisma, request, {
    action:
      status === 'CANCELLED'
        ? AUDIT_ACTIONS.APPOINTMENT_CANCELLED
        : AUDIT_ACTIONS.APPOINTMENT_STATUS_CHANGED,
    entity: 'appointment',
    entityId: updated.id,
    professionalId,
    metadata: { from: current.status, to: status },
  });

  return toAppointmentDto(updated);
}

export async function listClients(
  prisma: PrismaClient,
  professionalId: string,
  search?: string,
) {
  return prisma.client.findMany({
    where: {
      professionalId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search.replace(/\D/g, '') } },
            ],
          }
        : {}),
    },
    orderBy: { name: 'asc' },
    take: 100,
  });
}

export async function createClient(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
  body: { name: string; phone: string; notes?: string; consentGiven: boolean },
) {
  try {
    const created = await prisma.client.create({
      data: {
        professionalId,
        name: body.name,
        phone: body.phone,
        notes: body.notes,
        consentGivenAt: body.consentGiven ? new Date() : null,
      },
    });

    await recordAudit(prisma, request, {
      action: AUDIT_ACTIONS.CLIENT_CREATED,
      entity: 'client',
      entityId: created.id,
      professionalId,
    });

    return created;
  } catch (error) {
    if (isPrismaError(error, PRISMA_ERROR.UNIQUE_VIOLATION)) {
      throw new AppError('DUPLICATE_RESOURCE', 409, {
        message: 'Você já tem uma cliente com este WhatsApp.',
      });
    }
    throw error;
  }
}

export async function listServices(prisma: PrismaClient, professionalId: string) {
  return prisma.service.findMany({
    where: { professionalId, isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function createService(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
  body: {
    name: string;
    category: string;
    durationMinutes: number;
    priceCents: number;
    bufferAfterMinutes: number;
  },
) {
  try {
    const created = await prisma.service.create({
      data: { professionalId, ...body },
    });
    await recordAudit(prisma, request, {
      action: AUDIT_ACTIONS.SERVICE_CREATED,
      entity: 'service',
      entityId: created.id,
      professionalId,
    });
    return created;
  } catch (error) {
    if (isPrismaError(error, PRISMA_ERROR.UNIQUE_VIOLATION)) {
      throw new AppError('DUPLICATE_RESOURCE', 409, {
        message: 'Você já tem um serviço com este nome.',
      });
    }
    throw error;
  }
}
