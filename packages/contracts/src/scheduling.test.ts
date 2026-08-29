import { describe, expect, it } from 'vitest';
import { zonedDateTimeToUtc } from './datetime.js';
import {
  canTransitionAppointmentStatus,
  computeAppointmentWindow,
  generateTimeSlots,
  intervalsOverlap,
  isAppointmentInPast,
  nextAppointmentStatuses,
} from './scheduling.js';

describe('intervalsOverlap', () => {
  const ten = new Date('2026-09-01T13:00:00.000Z');
  const eleven = new Date('2026-09-01T14:00:00.000Z');
  const noon = new Date('2026-09-01T15:00:00.000Z');
  const one = new Date('2026-09-01T16:00:00.000Z');

  it('detecta sobreposição parcial', () => {
    expect(intervalsOverlap(ten, noon, eleven, one)).toBe(true);
  });

  it('não conflita quando um termina exatamente quando o outro começa', () => {
    expect(intervalsOverlap(ten, eleven, eleven, noon)).toBe(false);
  });

  it('detecta quando um intervalo contém o outro', () => {
    expect(intervalsOverlap(ten, one, eleven, noon)).toBe(true);
  });
});

describe('computeAppointmentWindow', () => {
  it('soma duração e tempo de preparo em America/Fortaleza', () => {
    const window = computeAppointmentWindow({
      date: '2026-09-01',
      time: '14:00',
      durationMinutes: 60,
      bufferAfterMinutes: 15,
    });

    expect(window.startsAt).toEqual(zonedDateTimeToUtc('2026-09-01', '14:00'));
    expect(window.endsAt.getTime() - window.startsAt.getTime()).toBe(60 * 60_000);
    expect(window.blockedUntil.getTime() - window.endsAt.getTime()).toBe(15 * 60_000);
  });
});

describe('isAppointmentInPast', () => {
  it('recusa horário que já começou', () => {
    const now = new Date('2026-09-01T17:00:00.000Z');
    expect(isAppointmentInPast(new Date('2026-09-01T16:59:00.000Z'), now)).toBe(true);
    expect(isAppointmentInPast(new Date('2026-09-01T17:00:01.000Z'), now)).toBe(false);
  });
});

describe('canTransitionAppointmentStatus', () => {
  it('permite o fluxo de atendimento e bloqueia retrocesso', () => {
    expect(canTransitionAppointmentStatus('PENDING', 'CONFIRMED')).toBe(true);
    expect(canTransitionAppointmentStatus('CONFIRMED', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionAppointmentStatus('IN_PROGRESS', 'COMPLETED')).toBe(true);
    expect(canTransitionAppointmentStatus('COMPLETED', 'PENDING')).toBe(false);
    expect(canTransitionAppointmentStatus('CANCELLED', 'CONFIRMED')).toBe(false);
  });
});

describe('nextAppointmentStatuses', () => {
  it('lista só os próximos status permitidos', () => {
    expect(nextAppointmentStatuses('PENDING')).toEqual(['CONFIRMED', 'CANCELLED']);
    expect(nextAppointmentStatuses('COMPLETED')).toEqual([]);
  });
});

describe('generateTimeSlots', () => {
  it('marca ocupado o horário que cruza um atendimento existente', () => {
    const busyStart = zonedDateTimeToUtc('2026-09-01', '10:00');
    const slots = generateTimeSlots({
      date: '2026-09-01',
      openMinute: 9 * 60,
      closeMinute: 12 * 60,
      durationMinutes: 60,
      slotMinutes: 30,
      now: zonedDateTimeToUtc('2026-08-01', '08:00'),
      busy: [{ startsAt: busyStart, blockedUntil: zonedDateTimeToUtc('2026-09-01', '11:00') }],
    });

    const ten = slots.find((slot) => slot.time === '10:00');
    const nineThirty = slots.find((slot) => slot.time === '09:30');
    const eleven = slots.find((slot) => slot.time === '11:00');

    expect(ten?.available).toBe(false);
    expect(nineThirty?.available).toBe(false);
    expect(eleven?.available).toBe(true);
  });
});
