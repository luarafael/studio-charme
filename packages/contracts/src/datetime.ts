import { z } from 'zod';

/**
 * O Studio Charme opera em Fortaleza. Todo horário exibido ou informado pelas
 * usuárias é interpretado nesse fuso, enquanto o banco guarda sempre UTC.
 */
export const SALON_TIME_ZONE = 'America/Fortaleza';

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data no formato AAAA-MM-DD.')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number) as [number, number, number];
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, 'Data inexistente no calendário.');

export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Informe o horário no formato HH:MM.');

export const isoDateTimeSchema = z.iso.datetime({ offset: true }).or(z.iso.datetime());

export type IsoDate = z.infer<typeof isoDateSchema>;
export type TimeOfDay = z.infer<typeof timeOfDaySchema>;

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = partsFormatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  partsFormatterCache.set(timeZone, formatter);
  return formatter;
}

/** Decompõe um instante nos componentes de calendário do fuso informado. */
export function getDateTimePartsInTimeZone(
  instant: Date,
  timeZone: string = SALON_TIME_ZONE,
): DateTimeParts {
  const parts = getPartsFormatter(timeZone).formatToParts(instant);
  const lookup = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((candidate) => candidate.type === type);
    return part ? Number(part.value) : 0;
  };
  return {
    year: lookup('year'),
    month: lookup('month'),
    day: lookup('day'),
    hour: lookup('hour'),
    minute: lookup('minute'),
    second: lookup('second'),
  };
}

function getOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = getDateTimePartsInTimeZone(instant, timeZone);
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return (asIfUtc - instant.getTime()) / 60_000;
}

/**
 * Converte data e hora locais do salão para o instante UTC correspondente.
 * A segunda passagem cobre mudanças de offset (horário de verão), garantindo
 * que o offset usado seja o vigente no instante realmente resultante.
 */
export function zonedDateTimeToUtc(
  date: IsoDate,
  time: TimeOfDay,
  timeZone: string = SALON_TIME_ZONE,
): Date {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const [hour, minute] = time.split(':').map(Number) as [number, number];

  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
  const firstGuessOffset = getOffsetMinutes(new Date(naiveUtc), timeZone);
  let instant = naiveUtc - firstGuessOffset * 60_000;

  const refinedOffset = getOffsetMinutes(new Date(instant), timeZone);
  if (refinedOffset !== firstGuessOffset) {
    instant = naiveUtc - refinedOffset * 60_000;
  }

  return new Date(instant);
}

/** Data local do salão no formato AAAA-MM-DD. */
export function toZonedIsoDate(instant: Date, timeZone: string = SALON_TIME_ZONE): IsoDate {
  const { year, month, day } = getDateTimePartsInTimeZone(instant, timeZone);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Horário local do salão no formato HH:MM. */
export function toZonedTimeOfDay(instant: Date, timeZone: string = SALON_TIME_ZONE): TimeOfDay {
  const { hour, minute } = getDateTimePartsInTimeZone(instant, timeZone);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Início do dia local do salão, em UTC. */
export function startOfZonedDay(date: IsoDate, timeZone: string = SALON_TIME_ZONE): Date {
  return zonedDateTimeToUtc(date, '00:00', timeZone);
}

/** Início do dia seguinte, usado como limite superior exclusivo em consultas. */
export function endOfZonedDay(date: IsoDate, timeZone: string = SALON_TIME_ZONE): Date {
  return new Date(startOfZonedDay(date, timeZone).getTime() + 24 * 60 * 60 * 1000);
}

/** Dia da semana no fuso do salão: 0 = domingo, 6 = sábado. */
export function getZonedWeekday(instant: Date, timeZone: string = SALON_TIME_ZONE): number {
  const { year, month, day } = getDateTimePartsInTimeZone(instant, timeZone);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function getWeekdayFromIsoDate(date: IsoDate): number {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

export const WEEKDAY_SHORT_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

/** Converte "HH:MM" em minutos desde a meia-noite. */
export function timeToMinutes(time: TimeOfDay): number {
  const [hour, minute] = time.split(':').map(Number) as [number, number];
  return hour * 60 + minute;
}

/** Converte minutos desde a meia-noite em "HH:MM". */
export function minutesToTime(minutes: number): TimeOfDay {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function addIsoDateDays(date: IsoDate, days: number): IsoDate {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${String(shifted.getUTCFullYear()).padStart(4, '0')}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}
