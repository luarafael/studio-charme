import { z } from 'zod';
import {
  createExpenseBodySchema,
  createPaymentBodySchema,
  expenseSchema,
  listFinanceQuerySchema,
  paymentSchema,
  updateExpenseBodySchema,
  updatePaymentBodySchema,
  uuidSchema,
} from '@studio-charme/contracts';
import type { AppInstance } from '../../types/app.js';
import { getScopedProfessionalId } from '../../lib/scope.js';
import {
  createExpense,
  createPayment,
  deleteExpense,
  deletePayment,
  listExpenses,
  listPayments,
  markPaymentPaid,
  updateExpense,
  updatePayment,
} from './service.js';

export async function financeRoutes(app: AppInstance): Promise<void> {
  app.get(
    '/payments',
    {
      preHandler: app.requireAuth,
      schema: {
        querystring: listFinanceQuerySchema,
        response: { 200: z.object({ items: z.array(paymentSchema) }) },
      },
    },
    async (request) => ({
      items: await listPayments(app.prisma, getScopedProfessionalId(request), request.query),
    }),
  );

  app.post(
    '/payments',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: {
        body: createPaymentBodySchema,
        response: { 201: paymentSchema },
      },
    },
    async (request, reply) => {
      const created = await createPayment(
        app.prisma,
        request,
        getScopedProfessionalId(request),
        request.body,
      );
      return reply.status(201).send(created);
    },
  );

  app.post(
    '/payments/:id/pay',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: {
        params: z.object({ id: uuidSchema }),
        response: { 200: paymentSchema },
      },
    },
    async (request) =>
      markPaymentPaid(app.prisma, request, getScopedProfessionalId(request), request.params.id),
  );

  app.patch(
    '/payments/:id',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: {
        params: z.object({ id: uuidSchema }),
        body: updatePaymentBodySchema,
        response: { 200: paymentSchema },
      },
    },
    async (request) =>
      updatePayment(
        app.prisma,
        request,
        getScopedProfessionalId(request),
        request.params.id,
        request.body,
      ),
  );

  app.delete(
    '/payments/:id',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: { params: z.object({ id: uuidSchema }) },
    },
    async (request, reply) => {
      await deletePayment(app.prisma, request, getScopedProfessionalId(request), request.params.id);
      return reply.status(204).send();
    },
  );

  app.get(
    '/expenses',
    {
      preHandler: app.requireAuth,
      schema: {
        querystring: listFinanceQuerySchema,
        response: { 200: z.object({ items: z.array(expenseSchema) }) },
      },
    },
    async (request) => ({
      items: await listExpenses(app.prisma, getScopedProfessionalId(request), request.query),
    }),
  );

  app.post(
    '/expenses',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: {
        body: createExpenseBodySchema,
        response: { 201: expenseSchema },
      },
    },
    async (request, reply) => {
      const created = await createExpense(
        app.prisma,
        request,
        getScopedProfessionalId(request),
        request.body,
      );
      return reply.status(201).send(created);
    },
  );

  app.patch(
    '/expenses/:id',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: {
        params: z.object({ id: uuidSchema }),
        body: updateExpenseBodySchema,
        response: { 200: expenseSchema },
      },
    },
    async (request) =>
      updateExpense(
        app.prisma,
        request,
        getScopedProfessionalId(request),
        request.params.id,
        request.body,
      ),
  );

  app.delete(
    '/expenses/:id',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: { params: z.object({ id: uuidSchema }) },
    },
    async (request, reply) => {
      await deleteExpense(app.prisma, request, getScopedProfessionalId(request), request.params.id);
      return reply.status(204).send();
    },
  );
}
