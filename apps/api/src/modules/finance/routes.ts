import { z } from 'zod';
import {
  createExpenseBodySchema,
  createPaymentBodySchema,
  expenseSchema,
  listFinanceQuerySchema,
  paymentSchema,
} from '@studio-charme/contracts';
import type { AppInstance } from '../../types/app.js';
import { getScopedProfessionalId } from '../../lib/scope.js';
import { createExpense, createPayment, listExpenses, listPayments } from './service.js';

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
}
