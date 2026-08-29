import { z } from 'zod';
import {
  addIsoDateDays,
  createAvailabilityOverrideBodySchema,
  isoDateSchema,
  replaceBusinessHoursBodySchema,
  toZonedIsoDate,
} from '@studio-charme/contracts';
import type { AppInstance } from '../../types/app.js';
import { getScopedProfessionalId } from '../../lib/scope.js';
import {
  createOverride,
  listBusinessHours,
  listOverrides,
  replaceBusinessHours,
  toBusinessHourDto,
  toOverrideDto,
} from './service.js';

export async function availabilityRoutes(app: AppInstance): Promise<void> {
  app.get(
    '/availability/hours',
    { preHandler: app.requireAuth },
    async (request) => ({
      items: (await listBusinessHours(app.prisma, getScopedProfessionalId(request))).map(
        toBusinessHourDto,
      ),
    }),
  );

  app.put(
    '/availability/hours',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: { body: replaceBusinessHoursBodySchema },
    },
    async (request) => {
      const items = await replaceBusinessHours(
        app.prisma,
        request,
        getScopedProfessionalId(request),
        request.body.hours,
      );
      return { items: items.map(toBusinessHourDto) };
    },
  );

  app.get(
    '/availability/overrides',
    {
      preHandler: app.requireAuth,
      schema: {
        querystring: z.object({
          from: isoDateSchema.optional(),
          to: isoDateSchema.optional(),
        }),
      },
    },
    async (request) => {
      const today = toZonedIsoDate(new Date());
      const from = request.query.from ?? today;
      const to = request.query.to ?? addIsoDateDays(today, 60);
      const items = await listOverrides(app.prisma, getScopedProfessionalId(request), { from, to });
      return { items: items.map(toOverrideDto) };
    },
  );

  app.post(
    '/availability/overrides',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: { body: createAvailabilityOverrideBodySchema },
    },
    async (request, reply) => {
      const created = await createOverride(
        app.prisma,
        request,
        getScopedProfessionalId(request),
        request.body,
      );
      return reply.status(201).send(toOverrideDto(created));
    },
  );
}
