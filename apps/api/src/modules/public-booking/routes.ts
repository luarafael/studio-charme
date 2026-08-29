import {
  createPublicBookingBodySchema,
  publicAvailabilityQuerySchema,
  publicAvailabilitySchema,
  publicBookingResponseSchema,
  publicCatalogSchema,
} from '@studio-charme/contracts';
import type { AppInstance } from '../../types/app.js';
import { createPublicBooking, getPublicAvailability, getPublicCatalog } from './service.js';

export async function publicBookingRoutes(app: AppInstance): Promise<void> {
  const publicLimit = { max: 20, timeWindow: '1 minute' };
  const bookingLimit = {
    max: 6,
    timeWindow: '10 minutes',
    keyGenerator: (request: { ip: string }) => request.ip,
  };

  app.get(
    '/public/catalog',
    {
      config: { rateLimit: publicLimit },
      schema: { response: { 200: publicCatalogSchema } },
    },
    async () => getPublicCatalog(app.prisma),
  );

  app.get(
    '/public/availability',
    {
      config: { rateLimit: publicLimit },
      schema: {
        querystring: publicAvailabilityQuerySchema,
        response: { 200: publicAvailabilitySchema },
      },
    },
    async (request) =>
      getPublicAvailability(
        app.prisma,
        request.query.slug,
        request.query.date,
        request.query.serviceId,
      ),
  );

  app.post(
    '/public/bookings',
    {
      preHandler: app.requireCsrf,
      config: { rateLimit: bookingLimit },
      schema: {
        body: createPublicBookingBodySchema,
        response: { 201: publicBookingResponseSchema },
      },
    },
    async (request, reply) => {
      const created = await createPublicBooking(app.prisma, request, request.body);
      return reply.status(201).send(created);
    },
  );
}
