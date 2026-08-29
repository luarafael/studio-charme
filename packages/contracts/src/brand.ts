import { z } from 'zod';
import { authenticatedProfessionalSchema } from './auth.js';

export const PROFILE_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ProfilePhotoMimeType = (typeof PROFILE_PHOTO_MIME_TYPES)[number];

export const updateProfilePhotoBodySchema = z.object({
  imageBase64: z
    .string()
    .min(1, 'Envie uma foto.')
    .max(800_000, 'A foto ficou grande demais. Escolha outra ou recorte.'),
  mimeType: z.enum(PROFILE_PHOTO_MIME_TYPES),
});
export type UpdateProfilePhotoBody = z.infer<typeof updateProfilePhotoBodySchema>;

export const profilePhotoResponseSchema = z.object({
  professional: authenticatedProfessionalSchema,
});
export type ProfilePhotoResponse = z.infer<typeof profilePhotoResponseSchema>;
