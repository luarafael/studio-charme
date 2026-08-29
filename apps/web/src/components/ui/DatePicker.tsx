import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  addIsoDateDays,
  getWeekdayFromIsoDate,
  toZonedIsoDate,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT_LABELS,
  type IsoDate,
} from '@studio-charme/contracts';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export type DatePickerProps = {
  value: IsoDate | null;
  onChange: (date: IsoDate) => void;
  /** Primeira data selecionável, no formato AAAA-MM-DD. */
  minDate?: IsoDate;
  maxDate?: IsoDate;
  /** Bloqueia datas específicas, como folgas e dias sem horário livre. */
  isDateDisabled?: (date: IsoDate) => boolean;
  /** Rótulo acessível do calendário, descrevendo o que está sendo escolhido. */
  label: string;
  className?: string;
};

function firstDayOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

function shiftMonth(monthStart: IsoDate, offset: number): IsoDate {
  const [year, month] = monthStart.split('-').map(Number) as [number, number];
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function daysInMonth(monthStart: IsoDate): IsoDate[] {
  const [year, month] = monthStart.split('-').map(Number) as [number, number];
  const total = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from(
    { length: total },
    (_, index) => `${monthStart.slice(0, 8)}${String(index + 1).padStart(2, '0')}` as IsoDate,
  );
}

/**
 * Calendário acessível seguindo o padrão ARIA de grade.
 *
 * A grade usa tabindex móvel: apenas um dia é focável e as setas movem o foco,
 * então quem navega por teclado não precisa dar 30 Tabs para atravessar o mês.
 * Datas indisponíveis ficam desabilitadas com `aria-disabled` e continuam
 * legíveis, em vez de simplesmente desaparecerem.
 */
export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  isDateDisabled,
  label,
  className,
}: DatePickerProps) {
  const today = toZonedIsoDate(new Date());
  const [visibleMonth, setVisibleMonth] = useState<IsoDate>(() =>
    firstDayOfMonth(value ?? minDate ?? today),
  );
  const [focusedDate, setFocusedDate] = useState<IsoDate>(() => value ?? minDate ?? today);
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldRestoreFocus = useRef(false);

  /**
   * Acompanha a seleção feita fora do calendário, por exemplo ao voltar uma
   * etapa do agendamento. O ajuste acontece durante a renderização, comparando
   * com o valor anterior: um efeito aqui causaria uma renderização extra com o
   * mês errado visível por um instante.
   */
  const [lastSyncedValue, setLastSyncedValue] = useState(value);
  if (value !== null && value !== lastSyncedValue) {
    setLastSyncedValue(value);
    setVisibleMonth(firstDayOfMonth(value));
    setFocusedDate(value);
  }

  const isUnavailable = (date: IsoDate): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return isDateDisabled?.(date) ?? false;
  };

  const days = useMemo(() => daysInMonth(visibleMonth), [visibleMonth]);
  const leadingBlanks = getWeekdayFromIsoDate(visibleMonth);

  // Devolve o foco ao dia certo depois de o mês ser redesenhado pela navegação.
  useEffect(() => {
    if (!shouldRestoreFocus.current) return;
    shouldRestoreFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusedDate}"]`)?.focus();
  }, [focusedDate, visibleMonth]);

  const moveFocus = (nextDate: IsoDate): void => {
    setFocusedDate(nextDate);
    if (nextDate.slice(0, 7) !== visibleMonth.slice(0, 7)) {
      setVisibleMonth(firstDayOfMonth(nextDate));
    }
    shouldRestoreFocus.current = true;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };

    if (event.key in offsets) {
      event.preventDefault();
      moveFocus(addIsoDateDays(focusedDate, offsets[event.key]!));
      return;
    }

    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      const nextMonth = shiftMonth(firstDayOfMonth(focusedDate), event.key === 'PageUp' ? -1 : 1);
      // Preserva o dia do mês quando ele existe no mês de destino.
      const day = Number(focusedDate.slice(8, 10));
      const lastDay = daysInMonth(nextMonth).length;
      moveFocus(`${nextMonth.slice(0, 8)}${String(Math.min(day, lastDay)).padStart(2, '0')}`);
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const weekday = getWeekdayFromIsoDate(focusedDate);
      moveFocus(addIsoDateDays(focusedDate, event.key === 'Home' ? -weekday : 6 - weekday));
    }
  };

  const monthLabel = format(parseISO(visibleMonth), "MMMM 'de' yyyy", { locale: ptBR });
  const canGoBack = !minDate || shiftMonth(visibleMonth, -1) >= firstDayOfMonth(minDate);
  const canGoForward = !maxDate || shiftMonth(visibleMonth, 1) <= firstDayOfMonth(maxDate);

  return (
    <div className={cn('rounded-card border-brown-100 border bg-white p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          onClick={() => setVisibleMonth(shiftMonth(visibleMonth, -1))}
          disabled={!canGoBack}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Button>

        {/* aria-live anuncia a troca de mês para quem não vê a mudança visual. */}
        <p aria-live="polite" className="font-display text-brown-900 text-base font-semibold">
          {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        </p>

        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          onClick={() => setVisibleMonth(shiftMonth(visibleMonth, 1))}
          disabled={!canGoForward}
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </Button>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-label={label}
        onKeyDown={handleKeyDown}
        // A grade em si não entra na tabulação: o foco fica nos dias, com
        // tabindex móvel, conforme o padrão ARIA de grade.
        tabIndex={-1}
        className="grid grid-cols-7 gap-1"
      >
        {WEEKDAY_SHORT_LABELS.map((weekday, index) => (
          <div
            key={weekday}
            role="columnheader"
            aria-label={WEEKDAY_LABELS[index]}
            className="text-brown-500 pb-1 text-center text-xs font-semibold"
          >
            <abbr title={WEEKDAY_LABELS[index]} className="no-underline">
              {weekday}
            </abbr>
          </div>
        ))}

        {Array.from({ length: leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} role="gridcell" aria-hidden="true" />
        ))}

        {days.map((date) => {
          const disabled = isUnavailable(date);
          const selected = date === value;
          const isToday = date === today;
          const dayNumber = Number(date.slice(8, 10));

          return (
            <div key={date} role="gridcell" aria-selected={selected}>
              <button
                type="button"
                data-date={date}
                // Só o dia focado entra na ordem de tabulação.
                tabIndex={date === focusedDate ? 0 : -1}
                disabled={disabled}
                aria-disabled={disabled || undefined}
                aria-current={isToday ? 'date' : undefined}
                aria-label={format(parseISO(date), "d 'de' MMMM 'de' yyyy, EEEE", { locale: ptBR })}
                onClick={() => {
                  setFocusedDate(date);
                  onChange(date);
                }}
                onFocus={() => setFocusedDate(date)}
                className={cn(
                  'rounded-control flex size-9 items-center justify-center text-sm font-medium',
                  'ease-brand transition-colors duration-200',
                  'disabled:text-brown-300 disabled:cursor-not-allowed disabled:line-through',
                  selected
                    ? 'bg-brown-900 text-cream font-bold'
                    : 'text-brown-800 enabled:hover:bg-gold-100',
                  // Hoje ganha um anel, e não apenas cor, para não depender de cor.
                  isToday && !selected && 'ring-gold-600 ring-1 ring-inset',
                )}
              >
                {dayNumber}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
