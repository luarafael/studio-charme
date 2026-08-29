import { z } from 'zod';
import {
  clientSchema,
  createAppointmentBodySchema,
  createClientBodySchema,
  createServiceBodySchema,
  dashboardSchema,
  endOfZonedDay,
  listAppointmentsQuerySchema,
  serviceSchema,
  startOfZonedDay,
  updateAppointmentStatusBodySchema,
  updateClientBodySchema,
  updateServiceBodySchema,
  uuidSchema,
} from '@studio-charme/contracts';
import type { AppInstance } from '../../types/app.js';
import { getScopedProfessionalId } from '../../lib/scope.js';
import {
  createAppointment,
  createClient,
  createService,
  deleteClient,
  deleteService,
  getAppointment,
  listAppointments,
  listClients,
  listServices,
  toClientDto,
  toServiceDto,
  updateAppointmentStatus,
  updateClient,
  updateService,
} from './service.js';
import { getDashboard } from './dashboard.js';

export async function agendaRoutes(app: AppInstance): Promise<void> {
  app.get(
    '/dashboard',
    {
      preHandler: app.requireAuth,
      schema: { response: { 200: dashboardSchema } },
    },
    async (request) => getDashboard(app.prisma, getScopedProfessionalId(request)),
  );

  app.get(
    '/appointments',
    {
      preHandler: app.requireAuth,
      schema: { querystring: listAppointmentsQuerySchema },
    },
    async (request) => {
      const professionalId = getScopedProfessionalId(request);
      const { from, to, status, search } = request.query;
      return {
        items: await listAppointments(app.prisma, professionalId, {
          from: startOfZonedDay(from),
          to: endOfZonedDay(to),
          status,
          search,
        }),
      };
    },
  );

  app.get(
    '/appointments/:id',
    {
      preHandler: app.requireAuth,
      schema: { params: z.object({ id: uuidSchema }) },
    },
    async (request) =>
      getAppointment(app.prisma, getScopedProfessionalId(request), request.params.id),
  );

  app.post(
    '/appointments',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: { body: createAppointmentBodySchema },
    },
    async (request, reply) => {
      const created = await createAppointment(
        app.prisma,
        request,
        getScopedProfessionalId(request),
        request.body,
      );
      return reply.status(201).send(created);
    },
  );

  app.post(
    '/appointments/:id/status',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: {
        params: z.object({ id: uuidSchema }),
        body: updateAppointmentStatusBodySchema,
      },
    },
    async (request) =>
      updateAppointmentStatus(
        app.prisma,
        request,
        getScopedProfessionalId(request),
        request.params.id,
        request.body.status,
        request.body.cancelReason,
      ),
  );

  app.get(
    '/clients',
    { preHandler: app.requireAuth, schema: { querystring: z.object({ search: z.string().optional() }) } },
    async (request) => {
      const items = await listClients(
        app.prisma,
        getScopedProfessionalId(request),
        request.query.search,
      );
      return {
        items: items.map(toClientDto),
      };
    },
  );

  app.post(
    '/clients',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: { body: createClientBodySchema },
    },
    async (request, reply) => {
      const created = await createClient(
        app.prisma,
        request,
        getScopedProfessionalId(request),
        request.body,
      );
      return reply.status(201).send(toClientDto(created));
    },
  );

  app.patch(
    '/clients/:id',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: {
        params: z.object({ id: uuidSchema }),
        body: updateClientBodySchema,
        response: { 200: clientSchema },
      },
    },
    async (request) =>
      toClientDto(
        await updateClient(
          app.prisma,
          request,
          getScopedProfessionalId(request),
          request.params.id,
          request.body,
        ),
      ),
  );

  app.delete(
    '/clients/:id',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: { params: z.object({ id: uuidSchema }) },
    },
    async (request, reply) => {
      await deleteClient(app.prisma, request, getScopedProfessionalId(request), request.params.id);
      return reply.status(204).send();
    },
  );

  app.get('/services', { preHandler: app.requireAuth }, async (request) => {
    const items = await listServices(app.prisma, getScopedProfessionalId(request));
    return {
      items: items.map(toServiceDto),
    };
  });

  app.post(
    '/services',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: { body: createServiceBodySchema },
    },
    async (request, reply) => {
      const created = await createService(
        app.prisma,
        request,
        getScopedProfessionalId(request),
        request.body,
      );
      return reply.status(201).send(toServiceDto(created));
    },
  );

  app.patch(
    '/services/:id',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: {
        params: z.object({ id: uuidSchema }),
        body: updateServiceBodySchema,
        response: { 200: serviceSchema },
      },
    },
    async (request) =>
      toServiceDto(
        await updateService(
          app.prisma,
          request,
          getScopedProfessionalId(request),
          request.params.id,
          request.body,
        ),
      ),
  );

  app.delete(
    '/services/:id',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: { params: z.object({ id: uuidSchema }) },
    },
    async (request, reply) => {
      await deleteService(app.prisma, request, getScopedProfessionalId(request), request.params.id);
      return reply.status(204).send();
    },
  );
}
