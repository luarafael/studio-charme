import { useQuery } from '@tanstack/react-query';
import {
  APPOINTMENT_SOURCE_LABELS,
  APPOINTMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  formatBrazilianPhone,
  formatCents,
  type AppointmentDetailDto,
  type AppointmentDto,
  type PaymentStatus,
} from '@studio-charme/contracts';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { formatAppointmentWhen, formatIsoDateLong, formatTime } from '@/features/agenda/format';
import { APPOINTMENT_STATUS_TONE } from '@/features/agenda/status';

const PAYMENT_STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  PENDING: 'warning',
  PAID: 'success',
  PARTIAL: 'info',
  REFUNDED: 'neutral',
};

function isDetail(appointment: AppointmentDto | AppointmentDetailDto): appointment is AppointmentDetailDto {
  return 'payments' in appointment && Array.isArray(appointment.payments);
}

export function AppointmentDetailContent({
  appointment,
}: {
  appointment: AppointmentDto | AppointmentDetailDto;
}) {
  const payments = isDetail(appointment) ? appointment.payments : undefined;
  const paidCents = payments
    ?.filter((payment) => payment.status === 'PAID' || payment.status === 'PARTIAL')
    .reduce((sum, payment) => sum + payment.netCents, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={APPOINTMENT_STATUS_TONE[appointment.status]} withDot>
          {APPOINTMENT_STATUS_LABELS[appointment.status]}
        </Badge>
        <Badge>{APPOINTMENT_SOURCE_LABELS[appointment.source]}</Badge>
      </div>

      <section>
        <h3 className="text-brown-500 text-xs font-semibold tracking-wide uppercase">Cliente</h3>
        <p className="text-brown-900 mt-1 text-lg font-semibold">{appointment.client.name}</p>
        <p className="text-brown-600 mt-0.5 text-sm">{formatBrazilianPhone(appointment.client.phone)}</p>
      </section>

      <section>
        <h3 className="text-brown-500 text-xs font-semibold tracking-wide uppercase">Quando</h3>
        <p className="text-brown-900 mt-1 font-medium">{formatAppointmentWhen(appointment.startsAt)}</p>
        <p className="text-brown-600 mt-0.5 text-sm">
          {formatTime(appointment.startsAt)} – {formatTime(appointment.endsAt)}
        </p>
      </section>

      <section>
        <h3 className="text-brown-500 text-xs font-semibold tracking-wide uppercase">Serviços</h3>
        <ul className="mt-2 divide-y divide-brown-100 rounded-control border border-brown-100">
          {appointment.services.map((service) => (
            <li key={service.serviceId} className="flex items-start justify-between gap-3 px-3 py-2.5">
              <div>
                <p className="text-brown-900 font-medium">{service.name}</p>
                <p className="text-brown-500 text-sm">{service.durationMinutes} min</p>
              </div>
              <p className="text-brown-900 shrink-0 font-semibold">{formatCents(service.priceCents)}</p>
            </li>
          ))}
        </ul>
        <p className="text-brown-900 mt-3 text-right text-base font-semibold">
          Total {formatCents(appointment.totalPriceCents)}
        </p>
      </section>

      {payments && (
        <section>
          <h3 className="text-brown-500 text-xs font-semibold tracking-wide uppercase">Recebimentos</h3>
          {payments.length === 0 ? (
            <p className="text-brown-600 mt-2 text-sm">Nenhum recebimento registrado neste atendimento.</p>
          ) : (
            <>
              <ul className="mt-2 divide-y divide-brown-100 rounded-control border border-brown-100">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                    <div>
                      <p className="text-brown-900 font-medium">{PAYMENT_METHOD_LABELS[payment.method]}</p>
                      <p className="text-brown-500 text-sm">{formatIsoDateLong(payment.paidOn)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-brown-900 font-semibold">{formatCents(payment.netCents)}</p>
                      <Badge tone={PAYMENT_STATUS_TONE[payment.status]} withDot>
                        {PAYMENT_STATUS_LABELS[payment.status]}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
              {paidCents !== undefined && (
                <p className="text-brown-600 mt-2 text-right text-sm">
                  Recebido {formatCents(paidCents)}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {appointment.notes?.trim() && (
        <section>
          <h3 className="text-brown-500 text-xs font-semibold tracking-wide uppercase">Anotação interna</h3>
          <p className="text-brown-800 mt-1 whitespace-pre-wrap text-sm">{appointment.notes}</p>
        </section>
      )}

      {appointment.clientNotes?.trim() && (
        <section>
          <h3 className="text-brown-500 text-xs font-semibold tracking-wide uppercase">Recado da cliente</h3>
          <p className="text-brown-800 mt-1 whitespace-pre-wrap text-sm">{appointment.clientNotes}</p>
        </section>
      )}
    </div>
  );
}

export function AppointmentDetailModal({
  appointment,
  open,
  onClose,
}: {
  appointment: AppointmentDto | null;
  open: boolean;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ['appointment', appointment?.id],
    queryFn: () => api<AppointmentDetailDto>(`/appointments/${appointment!.id}`),
    enabled: open && !!appointment,
  });

  const shown = detail.data ?? appointment;

  return (
    <Modal
      open={open && appointment !== null}
      onClose={onClose}
      title="Detalhe do atendimento"
      description={appointment ? appointment.client.name : undefined}
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {detail.isLoading && !shown ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : shown ? (
        <AppointmentDetailContent appointment={shown} />
      ) : (
        <p className="text-brown-600 text-sm">Não foi possível carregar este atendimento.</p>
      )}
    </Modal>
  );
}
