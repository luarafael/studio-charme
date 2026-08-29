import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  getDateTimePartsInTimeZone,
  getWeekdayFromIsoDate,
  getZonedWeekday,
  WEEKDAY_LABELS,
  type IsoDate,
} from '@studio-charme/contracts';

const MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' });

/** Data civil do salão (AAAA-MM-DD), sem deslocar o dia pelo fuso do aparelho. */
export function formatIsoDateLong(date: IsoDate): string {
  const weekday = WEEKDAY_LABELS[getWeekdayFromIsoDate(date)];
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const monthLabel = MONTH_FORMATTER.format(new Date(Date.UTC(year, month - 1, 1)));
  return `${weekday}, ${day} de ${monthLabel}`;
}

export function formatAppointmentWhen(iso: string): string {
  const instant = new Date(iso);
  const parts = getDateTimePartsInTimeZone(instant);
  const weekday = WEEKDAY_LABELS[getZonedWeekday(instant)];
  const monthLabel = format(
    new Date(Date.UTC(parts.year, parts.month - 1, 1)),
    'MMMM',
    { locale: ptBR },
  );
  const time = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
  return `${weekday}, ${parts.day} de ${monthLabel} às ${time}`;
}

export function formatTime(iso: string): string {
  const { hour, minute } = getDateTimePartsInTimeZone(new Date(iso));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
