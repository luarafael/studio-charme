import type { Expense, Payment } from '@prisma/client';
import {
  isoDateToUtcDate,
  netPaymentCents,
  paymentExceedsDue,
  paidTowardAppointmentCents,
  toZonedIsoDate,
  utcDateOnlyRange,
  utcDateToIsoDate,
  type CreateExpenseBody,
  type CreatePaymentBody,
  type ExpenseDto,
  type IsoDate,
  type PaymentDto,
  type PaymentStatus,
  type UpdateExpenseBody,
  type UpdatePaymentBody,
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
  return utcDateOnlyRange(from, to);
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
  const requestedStatus = body.status ?? 'PAID';
  let status: PaymentStatus = requestedStatus;

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
    if (requestedStatus === 'PAID' && paymentExceedsDue(appointment.totalPriceCents, alreadyPaid, netCents)) {
      throw new AppError('PAYMENT_EXCEEDS_TOTAL', 422);
    }

    if (requestedStatus === 'PAID') {
      const remainingAfter = appointment.totalPriceCents - alreadyPaid - netCents;
      status = remainingAfter > 0 ? 'PARTIAL' : 'PAID';
    }
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

async function findOwnedPayment(prisma: PrismaClient, professionalId: string, id: string) {
  const record = await prisma.payment.findFirst({
    where: { id, professionalId },
    include: { client: { select: { name: true } } },
  });
  if (!record) throw notFound();
  return record;
}

async function findOwnedExpense(prisma: PrismaClient, professionalId: string, id: string) {
  const record = await prisma.expense.findFirst({
    where: { id, professionalId },
  });
  if (!record) throw notFound();
  return record;
}

export async function updatePayment(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
  id: string,
  body: UpdatePaymentBody,
): Promise<PaymentDto> {
  const current = await findOwnedPayment(prisma, professionalId, id);
  const netCents = netPaymentCents(body.amountCents, body.discountCents);
  let clientId = body.clientId === undefined ? current.clientId : body.clientId;
  let status: PaymentStatus = body.status;

  if (current.appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: current.appointmentId, professionalId },
      select: { id: true, clientId: true, totalPriceCents: true },
    });
    if (!appointment) throw notFound();
    clientId = appointment.clientId;

    const existing = await prisma.payment.findMany({
      where: { professionalId, appointmentId: appointment.id, id: { not: current.id } },
      select: { amountCents: true, discountCents: true, status: true },
    });
    const alreadyPaid = paidTowardAppointmentCents(existing);
    if (body.status === 'PAID' && paymentExceedsDue(appointment.totalPriceCents, alreadyPaid, netCents)) {
      throw new AppError('PAYMENT_EXCEEDS_TOTAL', 422);
    }
    if (body.status === 'PAID') {
      const remainingAfter = appointment.totalPriceCents - alreadyPaid - netCents;
      status = remainingAfter > 0 ? 'PARTIAL' : 'PAID';
    }
  } else if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, professionalId, isActive: true },
      select: { id: true },
    });
    if (!client) throw notFound();
  }

  const updated = await prisma.payment.update({
    where: { id: current.id },
    data: {
      clientId,
      amountCents: body.amountCents,
      discountCents: body.discountCents,
      method: body.method,
      status,
      paidOn: isoDateToUtcDate(body.paidOn),
      notes: body.notes?.trim() ? body.notes.trim() : null,
    },
    include: { client: { select: { name: true } } },
  });

  await recordAudit(prisma, request, {
    action: AUDIT_ACTIONS.PAYMENT_UPDATED,
    entity: 'payment',
    entityId: updated.id,
    professionalId,
  });

  return toPaymentDto(updated);
}

export async function markPaymentPaid(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
  id: string,
): Promise<PaymentDto> {
  const current = await findOwnedPayment(prisma, professionalId, id);
  if (current.status === 'PAID') return toPaymentDto(current);

  return updatePayment(prisma, request, professionalId, id, {
    amountCents: current.amountCents,
    discountCents: current.discountCents,
    method: current.method,
    paidOn: toZonedIsoDate(new Date()),
    notes: current.notes ?? undefined,
    status: 'PAID',
    clientId: current.clientId,
  });
}

export async function deletePayment(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
  id: string,
): Promise<void> {
  const current = await findOwnedPayment(prisma, professionalId, id);
  await prisma.payment.delete({ where: { id: current.id } });
  await recordAudit(prisma, request, {
    action: AUDIT_ACTIONS.PAYMENT_DELETED,
    entity: 'payment',
    entityId: current.id,
    professionalId,
  });
}

export async function updateExpense(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
  id: string,
  body: UpdateExpenseBody,
): Promise<ExpenseDto> {
  const current = await findOwnedExpense(prisma, professionalId, id);
  const updated = await prisma.expense.update({
    where: { id: current.id },
    data: {
      description: body.description,
      category: body.category,
      amountCents: body.amountCents,
      incurredOn: isoDateToUtcDate(body.incurredOn),
      dueOn: body.dueOn === undefined ? undefined : body.dueOn ? isoDateToUtcDate(body.dueOn) : null,
      notes: body.notes === undefined ? undefined : body.notes.trim() ? body.notes.trim() : null,
    },
  });

  await recordAudit(prisma, request, {
    action: AUDIT_ACTIONS.EXPENSE_UPDATED,
    entity: 'expense',
    entityId: updated.id,
    professionalId,
  });

  return toExpenseDto(updated);
}

export async function deleteExpense(
  prisma: PrismaClient,
  request: FastifyRequest,
  professionalId: string,
  id: string,
): Promise<void> {
  const current = await findOwnedExpense(prisma, professionalId, id);
  await prisma.expense.delete({ where: { id: current.id } });
  await recordAudit(prisma, request, {
    action: AUDIT_ACTIONS.EXPENSE_DELETED,
    entity: 'expense',
    entityId: current.id,
    professionalId,
  });
}
