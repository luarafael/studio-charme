import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  rangeForPeriod,
  shiftPeriodAnchor,
  type DashboardPeriod,
  type IsoDate,
} from '@studio-charme/contracts';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { formatIsoDateLong } from '@/features/agenda/format';

const PERIOD_ITEMS = [
  { value: 'day' as const, label: 'Dia' },
  { value: 'week' as const, label: 'Semana' },
  { value: 'month' as const, label: 'Mês' },
];

export function periodNoun(period: DashboardPeriod): string {
  if (period === 'day') return 'dia';
  if (period === 'week') return 'semana';
  return 'mês';
}

export function formatPeriodRange(period: DashboardPeriod, anchor: IsoDate): string {
  const { from, to } = rangeForPeriod(period, anchor);
  if (period === 'day') return formatIsoDateLong(from);
  const formatShort = (date: IsoDate) => date.split('-').reverse().join('/');
  if (period === 'week') return `${formatShort(from)} a ${formatShort(to)}`;
  const [year, month] = from.split('-') as [string, string];
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(Number(year), Number(month) - 1, 1)),
  );
  return `${monthLabel} de ${year}`;
}

type PeriodToolbarProps = {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  anchor: IsoDate;
  onAnchorChange: (date: IsoDate) => void;
  label: string;
};

export function PeriodToolbar({
  period,
  onPeriodChange,
  anchor,
  onAnchorChange,
  label,
}: PeriodToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <Tabs items={PERIOD_ITEMS} value={period} onChange={onPeriodChange} label={label} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={<ChevronLeft className="size-4" aria-hidden="true" />}
          onClick={() => onAnchorChange(shiftPeriodAnchor(period, anchor, -1))}
        >
          Anterior
        </Button>
        <p className="text-brown-900 min-w-0 flex-1 text-sm font-semibold capitalize sm:flex-none">
          {formatPeriodRange(period, anchor)}
        </p>
        <Button
          variant="secondary"
          size="sm"
          trailingIcon={<ChevronRight className="size-4" aria-hidden="true" />}
          onClick={() => onAnchorChange(shiftPeriodAnchor(period, anchor, 1))}
        >
          Próximo
        </Button>
      </div>
    </div>
  );
}
