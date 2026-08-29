import type { AuthenticatedProfessional } from '@studio-charme/contracts';

export const professionalSessionSelect = {
  id: true,
  slug: true,
  name: true,
  email: true,
  role: true,
  photoMime: true,
  photoUpdatedAt: true,
} as const;

type ProfessionalSessionRow = {
  id: string;
  slug: string;
  name: string;
  email: string;
  role: string;
  photoMime: string | null;
  photoUpdatedAt: Date | null;
};

export function toAuthenticatedProfessional(
  row: ProfessionalSessionRow,
): AuthenticatedProfessional {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    email: row.email,
    role: row.role,
    photoUrl:
      row.photoMime && row.photoUpdatedAt
        ? `/public/professionals/${row.slug}/photo?v=${row.photoUpdatedAt.toISOString()}`
        : null,
  };
}
