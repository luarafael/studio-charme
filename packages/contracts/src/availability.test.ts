import { describe, expect, it } from 'vitest';
import { resolveDaySchedule } from './availability.js';
import { generateSlotsForRanges } from './scheduling.js';
import { zonedDateTimeToUtc } from './datetime.js';

describe('resolveDaySchedule', () => {
  const morning = { startMinute: 8 * 60, endMinute: 12 * 60 };

  it('fecha o dia em folga integral', () => {
    const resolved = resolveDaySchedule([morning], [
      { type: 'TIME_OFF', startMinute: null, endMinute: null },
    ]);
    expect(resolved.closed).toBe(true);
    expect(resolved.ranges).toEqual([]);
  });

  it('acrescenta extra e marca intervalo como ocupado', () => {
    const resolved = resolveDaySchedule([morning], [
      { type: 'EXTRA', startMinute: 14 * 60, endMinute: 18 * 60 },
      { type: 'BREAK', startMinute: 10 * 60, endMinute: 10 * 60 + 30 },
    ]);
    expect(resolved.closed).toBe(false);
    if (resolved.closed) return;
    expect(resolved.ranges).toHaveLength(2);
    expect(resolved.extraBusy).toEqual([{ startMinute: 10 * 60, endMinute: 10 * 60 + 30 }]);
  });
});

describe('generateSlotsForRanges', () => {
  it('gera horários nas duas faixas e respeita ocupação', () => {
    const busyStart = zonedDateTimeToUtc('2026-09-01', '09:00');
    const slots = generateSlotsForRanges({
      date: '2026-09-01',
      ranges: [
        { startMinute: 8 * 60, endMinute: 10 * 60 },
        { startMinute: 14 * 60, endMinute: 16 * 60 },
      ],
      durationMinutes: 60,
      now: zonedDateTimeToUtc('2026-08-01', '08:00'),
      busy: [{ startsAt: busyStart, blockedUntil: zonedDateTimeToUtc('2026-09-01', '10:00') }],
    });

    expect(slots.find((slot) => slot.time === '08:00')?.available).toBe(true);
    expect(slots.find((slot) => slot.time === '09:00')?.available).toBe(false);
    expect(slots.find((slot) => slot.time === '14:00')?.available).toBe(true);
    expect(slots.find((slot) => slot.time === '12:00')).toBeUndefined();
  });
});
