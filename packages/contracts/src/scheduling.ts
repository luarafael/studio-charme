import {
  BLOCKING_APPOINTMENT_STATUSES,
  type AppointmentStatus,
} from './enums.js';
import {
  minutesToTime,
  timeToMinutes,
  zonedDateTimeToUtc,
  type IsoDate,
  type TimeOfDay,
} from './datetime.js';

export const DEFAULT_SLOT_MINUTES = 30;

/** Dois intervalos [início, fim) se sobrepõem quando cada um começa antes do outro terminar. */
export function intervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA.getTime() < endB.getTime() && startB.getTime() < endA.getTime();
}

export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60_000);
}

export function computeAppointmentWindow(params: {
  date: IsoDate;
  time: TimeOfDay;
  durationMinutes: number;
  bufferAfterMinutes?: number;
}): { startsAt: Date; endsAt: Date; blockedUntil: Date } {
  const startsAt = zonedDateTimeToUtc(params.date, params.time);
  const endsAt = addMinutes(startsAt, params.durationMinutes);
  const blockedUntil = addMinutes(endsAt, params.bufferAfterMinutes ?? 0);
  return { startsAt, endsAt, blockedUntil };
}

export function isAppointmentInPast(startsAt: Date, now: Date = new Date()): boolean {
  return startsAt.getTime() <= now.getTime();
}

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransitionAppointmentStatus(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function nextAppointmentStatuses(
  from: AppointmentStatus,
): readonly AppointmentStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function occupiesSchedule(status: AppointmentStatus): boolean {
  return (BLOCKING_APPOINTMENT_STATUSES as readonly string[]).includes(status);
}

export type BusyRange = {
  startsAt: Date;
  blockedUntil: Date;
};

export type Slot = {
  time: TimeOfDay;
  available: boolean;
  reason?: 'past' | 'busy';
};

/**
 * Gera horários de início a cada `slotMinutes`, cabendo a duração do serviço
 * antes do fechamento e evitando intervalos já ocupados.
 */
export function generateTimeSlots(params: {
  date: IsoDate;
  openMinute: number;
  closeMinute: number;
  durationMinutes: number;
  bufferAfterMinutes?: number;
  slotMinutes?: number;
  busy: readonly BusyRange[];
  now?: Date;
}): Slot[] {
  const slotMinutes = params.slotMinutes ?? DEFAULT_SLOT_MINUTES;
  const buffer = params.bufferAfterMinutes ?? 0;
  const now = params.now ?? new Date();
  const slots: Slot[] = [];

  for (
    let startMinute = params.openMinute;
    startMinute + params.durationMinutes + buffer <= params.closeMinute;
    startMinute += slotMinutes
  ) {
    const time = minutesToTime(startMinute);
    const window = computeAppointmentWindow({
      date: params.date,
      time,
      durationMinutes: params.durationMinutes,
      bufferAfterMinutes: buffer,
    });

    if (isAppointmentInPast(window.startsAt, now)) {
      slots.push({ time, available: false, reason: 'past' });
      continue;
    }

    const busy = params.busy.some((range) =>
      intervalsOverlap(window.startsAt, window.blockedUntil, range.startsAt, range.blockedUntil),
    );

    slots.push(busy ? { time, available: false, reason: 'busy' } : { time, available: true });
  }

  return slots;
}

export type MinuteRange = {
  startMinute: number;
  endMinute: number;
};

/** Une várias faixas do mesmo dia (manhã e tarde, ou jornada + extra). */
export function generateSlotsForRanges(params: {
  date: IsoDate;
  ranges: readonly MinuteRange[];
  durationMinutes: number;
  bufferAfterMinutes?: number;
  slotMinutes?: number;
  busy: readonly BusyRange[];
  now?: Date;
}): Slot[] {
  const byTime = new Map<string, Slot>();
  for (const range of params.ranges) {
    if (range.endMinute <= range.startMinute) continue;
    const slots = generateTimeSlots({
      date: params.date,
      openMinute: range.startMinute,
      closeMinute: range.endMinute,
      durationMinutes: params.durationMinutes,
      bufferAfterMinutes: params.bufferAfterMinutes,
      slotMinutes: params.slotMinutes,
      busy: params.busy,
      now: params.now,
    });
    for (const slot of slots) {
      const current = byTime.get(slot.time);
      if (!current || (slot.available && !current.available)) {
        byTime.set(slot.time, slot);
      }
    }
  }
  return [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
}

export function findConflictingRange(
  window: { startsAt: Date; blockedUntil: Date },
  busy: readonly BusyRange[],
): BusyRange | undefined {
  return busy.find((range) =>
    intervalsOverlap(window.startsAt, window.blockedUntil, range.startsAt, range.blockedUntil),
  );
}

export { timeToMinutes, minutesToTime };
