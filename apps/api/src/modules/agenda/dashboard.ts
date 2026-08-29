import type { PrismaClient } from '@prisma/client';
import { endOfZonedDay, startOfZonedDay, toZonedIsoDate, type DashboardDto } from '@studio-charme/contracts';
import { toAppointmentDto } from './service.js';

function startOfMonth(date: Date): Date {
  const iso = toZonedIsoDate(date);
  const [year, month] = iso.split('-') as [string, string];
  return startOfZonedDay(`${year}-${month}-01`);
}

export async function getDashboard(
  prisma: PrismaClient,
  professionalId: string,
  now = new Date(),
): Promise<DashboardDto> {
  const today = toZonedIsoDate(now);
  const todayStart = startOfZonedDay(today);
  const tomorrow = endOfZonedDay(today);
  const monthStart = startOfMonth(now);

  const [
    todayAppointments,
    upcoming,
    pendingCount,
    cancelledCount,
    noShowCount,
    completed,
    payments,
    expenses,
    professional,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { professionalId, startsAt: { gte: todayStart, lt: tomorrow } },
      include: { client: { select: { id: true, name: true, phone: true } }, services: true },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.appointment.findMany({
      where: {
        professionalId,
        // A partir de agora, não só de amanhã: horário confirmado para hoje à
        // tarde também entra em Próximos.
        startsAt: { gte: now },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: { client: { select: { id: true, name: true, phone: true } }, services: true },
      orderBy: { startsAt: 'asc' },
      take: 8,
    }),
    prisma.appointment.count({ where: { professionalId, status: 'PENDING' } }),
    prisma.appointment.count({
      where: { professionalId, status: 'CANCELLED', startsAt: { gte: monthStart } },
    }),
    prisma.appointment.count({
      where: { professionalId, status: 'NO_SHOW', startsAt: { gte: monthStart } },
    }),
    prisma.appointment.findMany({
      where: {
        professionalId,
        status: 'COMPLETED',
        completedAt: { gte: monthStart },
      },
      select: { id: true, totalPriceCents: true, clientId: true },
    }),
    prisma.payment.aggregate({
      where: { professionalId, status: 'PAID', paidOn: { gte: monthStart } },
      _sum: { amountCents: true, discountCents: true },
    }),
    prisma.expense.aggregate({
      where: { professionalId, status: 'PAID', incurredOn: { gte: monthStart } },
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
  const pendingCents = completed.reduce((sum, item) => {
    const paid = paidMap.get(item.id) ?? 0;
    return sum + Math.max(0, item.totalPriceCents - paid);
  }, 0);
  const completedTotal = completed.reduce((sum, item) => sum + item.totalPriceCents, 0);
  const averageTicketCents =
    completed.length === 0 ? 0 : Math.round(completedTotal / completed.length);
  const expenseCents = expenses._sum.amountCents ?? 0;
  const basisPoints = professional?.commissionBasisPoints ?? 10_000;
  const estimatedCommissionCents = Math.round((receivedCents * basisPoints) / 10_000);
  const clientsServed = new Set(completed.map((item) => item.clientId)).size;

  return {
    todayCount: todayAppointments.length,
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
    todayAppointments: todayAppointments.map(toAppointmentDto),
    upcomingAppointments: upcoming.map(toAppointmentDto),
  };
}
