import type { AvailabilityOverride, BusinessHour, PrismaClient } from '@prisma/client';
import {
  addIsoDateDays,
  addMinutes,
  generateSlotsForRanges,
  getWeekdayFromIsoDate,
  isoDateToUtcDate,
  minutesToTime,
  occupiesSchedule,
  resolveDaySchedule,
  startOfZonedDay,
  utcDateToIsoDate,
  zonedDateTimeToUtc,
  type AvailabilityOverrideDto,
  type BusinessHourDto,
  type IsoDate,
  type MinuteRange,
  type Slot,
} from '@studio-charme/contracts';
import type { FastifyRequest } from 'fastify';
import { AUDIT_ACTIONS, recordAudit } from '../../lib/audit.js';

export function toBusinessHourDto(row: BusinessHour): BusinessHourDto {
  return { weekday: row.weekday, startMinute: row.startMinute, endMinute: row.endMinute };
}

export function toOverrideDto(row: AvailabilityOverride): AvailabilityOverrideDto {
  return {
    id: row.id,
    type: row.type,
    date: utcDateToIsoDate(row.date),
    startMinute: row.startMinute,
    endMinute: row.endMinute,
    reason: row.reason,
  };
}

export async function listBusinessHours(prisma: PrismaClient, professionalId: string) {
  return prisma.businessHour.findMany({
    where: { professionalId },
    orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
  });
}

export async function replaceBusinessHours(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
  hours: BusinessHourDto[],
) {
  const created = await prisma.$transaction(async (tx) => {
    await tx.businessHour.deleteMany({ where: { professionalId } });
    if (hours.length === 0) return [];
    await tx.businessHour.createMany({
      data: hours.map((hour) => ({ professionalId, ...hour })),
    });
    return tx.businessHour.findMany({
      where: { professionalId },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
    });
  });

  await recordAudit(prisma, request, {
    action: AUDIT_ACTIONS.APPOINTMENT_UPDATED,
    entity: 'business_hour',
    professionalId,
    metadata: { count: hours.length },
  });

  return created;
}

export async function listOverrides(
  prisma: PrismaClient,
  professionalId: string,
  range: { from: IsoDate; to: IsoDate },
) {
  return prisma.availabilityOverride.findMany({
    where: {
      professionalId,
      date: {
        gte: isoDateToUtcDate(range.from),
        lt: isoDateToUtcDate(addIsoDateDays(range.to, 1)),
      },
    },
    orderBy: { date: 'asc' },
  });
}

export async function createOverride(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
  body: {
    type: AvailabilityOverride['type'];
    date: IsoDate;
    startMinute?: number;
    endMinute?: number;
    reason?: string;
  },
) {
  const created = await prisma.availabilityOverride.create({
    data: {
      professionalId,
      type: body.type,
      date: isoDateToUtcDate(body.date),
      startMinute: body.startMinute ?? null,
      endMinute: body.endMinute ?? null,
      reason: body.reason,
    },
  });
  await recordAudit(prisma, request, {
    action: AUDIT_ACTIONS.APPOINTMENT_UPDATED,
    entity: 'availability_override',
    entityId: created.id,
    professionalId,
  });
  return created;
}

function extraBusyToRanges(date: IsoDate, extraBusy: readonly MinuteRange[]) {
  return extraBusy.map((range) => {
    const startsAt = zonedDateTimeToUtc(date, minutesToTime(range.startMinute));
    return {
      startsAt,
      blockedUntil: addMinutes(startsAt, range.endMinute - range.startMinute),
    };
  });
}

export async function computeDaySlots(
  prisma: PrismaClient,
  professionalId: string,
  date: IsoDate,
  durationMinutes: number,
  bufferAfterMinutes: number,
): Promise<{ closed: boolean; slots: Slot[] }> {
  const weekday = getWeekdayFromIsoDate(date);
  const [hours, overrides, appointments] = await Promise.all([
    prisma.businessHour.findMany({
      where: { professionalId, weekday },
      orderBy: { startMinute: 'asc' },
    }),
    prisma.availabilityOverride.findMany({
      where: { professionalId, date: isoDateToUtcDate(date) },
    }),
    prisma.appointment.findMany({
      where: {
        professionalId,
        startsAt: {
          gte: startOfZonedDay(date),
          lt: startOfZonedDay(addIsoDateDays(date, 1)),
        },
      },
      select: { startsAt: true, blockedUntil: true, status: true },
    }),
  ]);

  const resolved = resolveDaySchedule(
    hours.map((hour) => ({ startMinute: hour.startMinute, endMinute: hour.endMinute })),
    overrides.map((item) => ({
      type: item.type,
      startMinute: item.startMinute,
      endMinute: item.endMinute,
    })),
  );

  if (resolved.closed || resolved.ranges.length === 0) {
    return { closed: true, slots: [] };
  }

  const busy = [
    ...appointments
      .filter((item) => occupiesSchedule(item.status))
      .map((item) => ({ startsAt: item.startsAt, blockedUntil: item.blockedUntil })),
    ...extraBusyToRanges(date, resolved.extraBusy),
  ];

  return {
    closed: false,
    slots: generateSlotsForRanges({
      date,
      ranges: resolved.ranges,
      durationMinutes,
      bufferAfterMinutes,
      busy,
    }),
  };
}
