import { profilePhotoResponseSchema, updateProfilePhotoBodySchema } from '@studio-charme/contracts';
import { z } from 'zod';
import type { AppInstance } from '../../types/app.js';
import { getScopedProfessionalId } from '../../lib/scope.js';
import { getPublicProfessionalPhoto, removeOwnPhoto, updateOwnPhoto } from './service.js';

export async function profileRoutes(app: AppInstance): Promise<void> {
  const publicLimit = { max: 40, timeWindow: '1 minute' };

  app.get(
    '/public/professionals/:slug/photo',
    {
      config: { rateLimit: publicLimit },
      schema: {
        params: z.object({ slug: z.string().trim().min(2).max(40) }),
      },
    },
    async (request, reply) => {
      const photo = await getPublicProfessionalPhoto(app.prisma, request.params.slug);
      return reply
        .header('Content-Type', photo.mime)
        .header('Cache-Control', 'public, max-age=86400, immutable')
        .header('Cross-Origin-Resource-Policy', 'cross-origin')
        .header('Last-Modified', photo.updatedAt.toUTCString())
        .send(photo.bytes);
    },
  );

  app.put(
    '/professionals/me/photo',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      bodyLimit: 2_000_000,
      schema: {
        body: updateProfilePhotoBodySchema,
        response: { 200: profilePhotoResponseSchema },
      },
    },
    async (request) => {
      const professional = await updateOwnPhoto(
        app.prisma,
        request,
        getScopedProfessionalId(request),
        request.body,
      );
      return { professional };
    },
  );

  app.delete(
    '/professionals/me/photo',
    {
      preHandler: [app.requireAuth, app.requireCsrf],
      schema: { response: { 200: profilePhotoResponseSchema } },
    },
    async (request) => {
      const professional = await removeOwnPhoto(
        app.prisma,
        request,
        getScopedProfessionalId(request),
      );
      return { professional };
    },
  );
}
