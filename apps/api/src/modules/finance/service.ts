import type { Expense, Payment } from '@prisma/client';
import {
  addIsoDateDays,
  isoDateToUtcDate,
  netPaymentCents,
  paymentExceedsDue,
  paidTowardAppointmentCents,
  utcDateToIsoDate,
  type CreateExpenseBody,
  type CreatePaymentBody,
  type ExpenseDto,
  type IsoDate,
  type PaymentDto,
  type PaymentStatus,
} from '@studio-charme/contracts';
import type { FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { AppError, notFound } from '../../lib/errors.js';
import { AUDIT_ACTIONS, recordAudit } from '../../lib/audit.js';

type PaymentRecord = Payment & { client: { name: string } | null };

export function toPaymentDto(record: PaymentRecord): PaymentDto {
  return {
    id: record.id,
    appointmentId: record.appointmentId,
    clientId: record.clientId,
    clientName: record.client?.name ?? null,
    amountCents: record.amountCents,
    discountCents: record.discountCents,
    netCents: netPaymentCents(record.amountCents, record.discountCents),
    method: record.method,
    status: record.status,
    paidOn: utcDateToIsoDate(record.paidOn),
    notes: record.notes,
  };
}

export function toExpenseDto(record: Expense): ExpenseDto {
  return {
    id: record.id,
    description: record.description,
    category: record.category,
    amountCents: record.amountCents,
    status: record.status,
    incurredOn: utcDateToIsoDate(record.incurredOn),
    dueOn: record.dueOn ? utcDateToIsoDate(record.dueOn) : null,
    notes: record.notes,
  };
}

function dateOnlyRange(from: IsoDate, to: IsoDate): { gte: Date; lt: Date } {
  return {
    gte: isoDateToUtcDate(from),
    lt: isoDateToUtcDate(addIsoDateDays(to, 1)),
  };
}

export async function listPayments(
  prisma: PrismaClient,
  professionalId: string,
  range: { from: IsoDate; to: IsoDate },
): Promise<PaymentDto[]> {
  const records = await prisma.payment.findMany({
    where: {
      professionalId,
      paidOn: dateOnlyRange(range.from, range.to),
    },
    include: { client: { select: { name: true } } },
    orderBy: { paidOn: 'desc' },
    take: 100,
  });
  return records.map(toPaymentDto);
}

export async function listExpenses(
  prisma: PrismaClient,
  professionalId: string,
  range: { from: IsoDate; to: IsoDate },
): Promise<ExpenseDto[]> {
  const records = await prisma.expense.findMany({
    where: {
      professionalId,
      incurredOn: dateOnlyRange(range.from, range.to),
    },
    orderBy: { incurredOn: 'desc' },
    take: 100,
  });
  return records.map(toExpenseDto);
}

export async function createPayment(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
  body: CreatePaymentBody,
): Promise<PaymentDto> {
  const netCents = netPaymentCents(body.amountCents, body.discountCents);
  let clientId = body.clientId ?? null;
  let status: PaymentStatus = 'PAID';

  if (body.appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: body.appointmentId, professionalId },
      select: { id: true, clientId: true, totalPriceCents: true },
    });
    if (!appointment) throw notFound();

    clientId = appointment.clientId;

    const existing = await prisma.payment.findMany({
      where: { professionalId, appointmentId: appointment.id },
      select: { amountCents: true, discountCents: true, status: true },
    });
    const alreadyPaid = paidTowardAppointmentCents(existing);
    if (paymentExceedsDue(appointment.totalPriceCents, alreadyPaid, netCents)) {
      throw new AppError('PAYMENT_EXCEEDS_TOTAL', 422);
    }

    const remainingAfter = appointment.totalPriceCents - alreadyPaid - netCents;
    status = remainingAfter > 0 ? 'PARTIAL' : 'PAID';
  } else if (body.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: body.clientId, professionalId, isActive: true },
      select: { id: true },
    });
    if (!client) throw notFound();
  }

  const created = await prisma.payment.create({
    data: {
      professionalId,
      appointmentId: body.appointmentId,
      clientId,
      amountCents: body.amountCents,
      discountCents: body.discountCents,
      method: body.method,
      status,
      paidOn: isoDateToUtcDate(body.paidOn),
      notes: body.notes,
    },
    include: { client: { select: { name: true } } },
  });

  await recordAudit(prisma, request, {
    action: AUDIT_ACTIONS.PAYMENT_CREATED,
    entity: 'payment',
    entityId: created.id,
    professionalId,
    metadata: { amountCents: body.amountCents, method: body.method },
  });

  return toPaymentDto(created);
}

export async function createExpense(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
  body: CreateExpenseBody,
): Promise<ExpenseDto> {
  const created = await prisma.expense.create({
    data: {
      professionalId,
      description: body.description,
      category: body.category,
      amountCents: body.amountCents,
      status: 'PAID',
      incurredOn: isoDateToUtcDate(body.incurredOn),
      dueOn: body.dueOn ? isoDateToUtcDate(body.dueOn) : undefined,
      notes: body.notes,
    },
  });

  await recordAudit(prisma, request, {
    action: AUDIT_ACTIONS.EXPENSE_CREATED,
    entity: 'expense',
    entityId: created.id,
    professionalId,
    metadata: { amountCents: body.amountCents, category: body.category },
  });

  return toExpenseDto(created);
}
