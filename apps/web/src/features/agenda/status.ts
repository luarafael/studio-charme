import {
  APPOINTMENT_STATUS_LABELS,
  nextAppointmentStatuses,
  type AppointmentStatus,
} from '@studio-charme/contracts';
import type { BadgeTone } from '@/components/ui/Badge';

export const APPOINTMENT_STATUS_TONE: Record<AppointmentStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  IN_PROGRESS: 'gold',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  NO_SHOW: 'danger',
};

export const APPOINTMENT_STATUS_ACTION_LABEL: Partial<Record<AppointmentStatus, string>> = {
  CONFIRMED: 'Confirmar',
  IN_PROGRESS: 'Iniciar',
  COMPLETED: 'Concluir',
  CANCELLED: 'Cancelar',
  NO_SHOW: 'Não compareceu',
};

export function statusLabel(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_LABELS[status];
}

export function availableStatusActions(from: AppointmentStatus): AppointmentStatus[] {
  return [...nextAppointmentStatuses(from)];
}
