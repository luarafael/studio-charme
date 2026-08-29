import { describe, expect, it } from 'vitest';
import {
  SALON_TIME_ZONE,
  addIsoDateDays,
  endOfZonedDay,
  getWeekdayFromIsoDate,
  isoDateSchema,
  minutesToTime,
  startOfZonedDay,
  timeOfDaySchema,
  timeToMinutes,
  toZonedIsoDate,
  toZonedTimeOfDay,
  zonedDateTimeToUtc,
} from './datetime.js';

describe('zonedDateTimeToUtc', () => {
  it('converte horário de Fortaleza para UTC somando 3 horas', () => {
    // Fortaleza é UTC-3 e não adota horário de verão desde 2019.
    const instant = zonedDateTimeToUtc('2026-03-10', '09:00');
    expect(instant.toISOString()).toBe('2026-03-10T12:00:00.000Z');
  });

  it('mantém o offset em datas de meses diferentes', () => {
    expect(zonedDateTimeToUtc('2026-07-15', '14:30').toISOString()).toBe(
      '2026-07-15T17:30:00.000Z',
    );
    expect(zonedDateTimeToUtc('2026-12-24', '18:00').toISOString()).toBe(
      '2026-12-24T21:00:00.000Z',
    );
  });

  it('atravessa a meia-noite local corretamente', () => {
    // 22:00 em Fortaleza já é o dia seguinte em UTC.
    expect(zonedDateTimeToUtc('2026-05-01', '22:00').toISOString()).toBe(
      '2026-05-02T01:00:00.000Z',
    );
  });

  it('é o inverso de toZonedIsoDate e toZonedTimeOfDay', () => {
    const cases: [string, string][] = [
      ['2026-01-01', '00:00'],
      ['2026-06-30', '13:45'],
      ['2026-11-15', '23:59'],
    ];
    for (const [date, time] of cases) {
      const instant = zonedDateTimeToUtc(date, time);
      expect(toZonedIsoDate(instant)).toBe(date);
      expect(toZonedTimeOfDay(instant)).toBe(time);
    }
  });
});

describe('startOfZonedDay / endOfZonedDay', () => {
  it('delimita o dia local do salão, não o dia UTC', () => {
    expect(startOfZonedDay('2026-04-20').toISOString()).toBe('2026-04-20T03:00:00.000Z');
    expect(endOfZonedDay('2026-04-20').toISOString()).toBe('2026-04-21T03:00:00.000Z');
  });

  it('cobre exatamente 24 horas', () => {
    const start = startOfZonedDay('2026-04-20').getTime();
    const end = endOfZonedDay('2026-04-20').getTime();
    expect(end - start).toBe(24 * 60 * 60 * 1000);
  });

  it('inclui um atendimento das 08:00 e exclui o início do dia seguinte', () => {
    const start = startOfZonedDay('2026-04-20');
    const end = endOfZonedDay('2026-04-20');
    const appointment = zonedDateTimeToUtc('2026-04-20', '08:00');
    expect(appointment >= start).toBe(true);
    expect(appointment < end).toBe(true);
    expect(zonedDateTimeToUtc('2026-04-21', '00:00') < end).toBe(false);
  });
});

describe('getWeekdayFromIsoDate', () => {
  it('identifica o dia da semana', () => {
    // 2026-08-28 é uma sexta-feira.
    expect(getWeekdayFromIsoDate('2026-08-28')).toBe(5);
    expect(getWeekdayFromIsoDate('2026-08-30')).toBe(0);
    expect(getWeekdayFromIsoDate('2026-08-31')).toBe(1);
  });
});

describe('timeToMinutes / minutesToTime', () => {
  it('converte horário em minutos desde a meia-noite', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('converte minutos de volta para horário', () => {
    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(1439)).toBe('23:59');
  });

  it('é reversível', () => {
    for (const time of ['00:00', '07:15', '12:00', '18:45', '23:59']) {
      expect(minutesToTime(timeToMinutes(time))).toBe(time);
    }
  });
});

describe('addIsoDateDays', () => {
  it('avança e retrocede datas atravessando meses e anos', () => {
    expect(addIsoDateDays('2026-08-28', 1)).toBe('2026-08-29');
    expect(addIsoDateDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addIsoDateDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addIsoDateDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addIsoDateDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('lida com ano bissexto', () => {
    expect(addIsoDateDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('isoDateSchema', () => {
  it('aceita datas válidas', () => {
    expect(isoDateSchema.safeParse('2026-08-28').success).toBe(true);
  });

  it('rejeita formato incorreto', () => {
    expect(isoDateSchema.safeParse('28/08/2026').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-8-28').success).toBe(false);
  });

  it('rejeita datas inexistentes no calendário', () => {
    expect(isoDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-13-01').success).toBe(false);
    expect(isoDateSchema.safeParse('2027-02-29').success).toBe(false);
  });
});

describe('timeOfDaySchema', () => {
  it('aceita horários válidos de 24 horas', () => {
    expect(timeOfDaySchema.safeParse('00:00').success).toBe(true);
    expect(timeOfDaySchema.safeParse('23:59').success).toBe(true);
  });

  it('rejeita horários inválidos', () => {
    expect(timeOfDaySchema.safeParse('24:00').success).toBe(false);
    expect(timeOfDaySchema.safeParse('09:60').success).toBe(false);
    expect(timeOfDaySchema.safeParse('9:00').success).toBe(false);
  });
});

describe('SALON_TIME_ZONE', () => {
  it('está fixado no fuso de operação do salão', () => {
    expect(SALON_TIME_ZONE).toBe('America/Fortaleza');
  });
});
