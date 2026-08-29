import type { PrismaClient } from '@prisma/client';
import {
  endOfZonedDay,
  rangeForPeriod,
  startOfZonedDay,
  toZonedIsoDate,
  utcDateOnlyRange,
  type DashboardDto,
  type IsoDate,
} from '@studio-charme/contracts';
import { toAppointmentDto } from './service.js';

export async function getDashboard(
  prisma: PrismaClient,
  professionalId: string,
  now = new Date(),
  range?: { from: IsoDate; to: IsoDate },
): Promise<DashboardDto> {
  const today = toZonedIsoDate(now);
  const period = range ?? rangeForPeriod('month', today);
  const periodStart = startOfZonedDay(period.from);
  const periodEnd = endOfZonedDay(period.to);
  const dateRange = utcDateOnlyRange(period.from, period.to);

  const [
    periodAppointments,
    periodCount,
    upcoming,
    pendingCount,
    cancelledCount,
    noShowCount,
    completed,
    payments,
    pendingPayments,
    expenses,
    professional,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { professionalId, startsAt: { gte: periodStart, lt: periodEnd } },
      include: { client: { select: { id: true, name: true, phone: true } }, services: true },
      orderBy: { startsAt: 'asc' },
      take: 40,
    }),
    prisma.appointment.count({
      where: { professionalId, startsAt: { gte: periodStart, lt: periodEnd } },
    }),
    prisma.appointment.findMany({
      where: {
        professionalId,
        startsAt: { gte: now },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: { client: { select: { id: true, name: true, phone: true } }, services: true },
      orderBy: { startsAt: 'asc' },
      take: 8,
    }),
    prisma.appointment.count({ where: { professionalId, status: 'PENDING' } }),
    prisma.appointment.count({
      where: { professionalId, status: 'CANCELLED', startsAt: { gte: periodStart, lt: periodEnd } },
    }),
    prisma.appointment.count({
      where: { professionalId, status: 'NO_SHOW', startsAt: { gte: periodStart, lt: periodEnd } },
    }),
    prisma.appointment.findMany({
      where: {
        professionalId,
        status: 'COMPLETED',
        completedAt: { gte: periodStart, lt: periodEnd },
      },
      select: { id: true, totalPriceCents: true, clientId: true },
    }),
    prisma.payment.aggregate({
      where: { professionalId, status: 'PAID', paidOn: dateRange },
      _sum: { amountCents: true, discountCents: true },
    }),
    prisma.payment.aggregate({
      where: {
        professionalId,
        status: 'PENDING',
        appointmentId: null,
        paidOn: dateRange,
      },
      _sum: { amountCents: true, discountCents: true },
    }),
    prisma.expense.aggregate({
      where: { professionalId, status: 'PAID', incurredOn: dateRange },
      _sum: { amountCents: true },
    }),
    prisma.professional.findUnique({
      where: { id: professionalId },
      select: { commissionBasisPoints: true },
    }),
  ]);

  const receivedCents = (payments._sum.amountCents ?? 0) - (payments._sum.discountCents ?? 0);
  const paidByAppointment = await prisma.payment.groupBy({
    by: ['appointmentId'],
    where: {
      professionalId,
      status: { in: ['PAID', 'PARTIAL'] },
      appointmentId: { in: completed.map((item) => item.id) },
    },
    _sum: { amountCents: true, discountCents: true },
  });
  const paidMap = new Map(
    paidByAppointment.map((row) => [
      row.appointmentId,
      (row._sum.amountCents ?? 0) - (row._sum.discountCents ?? 0),
    ]),
  );
  const leftoverCompleted = completed.reduce((sum, item) => {
    const paid = paidMap.get(item.id) ?? 0;
    return sum + Math.max(0, item.totalPriceCents - paid);
  }, 0);
  const registeredReceivable =
    (pendingPayments._sum.amountCents ?? 0) - (pendingPayments._sum.discountCents ?? 0);
  const pendingCents = leftoverCompleted + registeredReceivable;
  const completedTotal = completed.reduce((sum, item) => sum + item.totalPriceCents, 0);
  const averageTicketCents =
    completed.length === 0 ? 0 : Math.round(completedTotal / completed.length);
  const expenseCents = expenses._sum.amountCents ?? 0;
  const basisPoints = professional?.commissionBasisPoints ?? 10_000;
  const estimatedCommissionCents = Math.round((receivedCents * basisPoints) / 10_000);
  const clientsServed = new Set(completed.map((item) => item.clientId)).size;

  return {
    todayCount: periodCount,
    upcomingCount: upcoming.length,
    pendingCount,
    cancelledCount,
    noShowCount,
    receivedCents,
    pendingCents,
    averageTicketCents,
    expenseCents,
    balanceCents: receivedCents - expenseCents,
    estimatedCommissionCents,
    clientsServed,
    todayAppointments: periodAppointments.map(toAppointmentDto),
    upcomingAppointments: upcoming.map(toAppointmentDto),
  };
}
