import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Query string chega como texto, então os números são coeridos e limitados. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const sortDirectionSchema = z.enum(['asc', 'desc']);
export type SortDirection = z.infer<typeof sortDirectionSchema>;

/** Ordenação sempre restrita a uma lista fechada de campos por recurso. */
export function createSortSchema<const T extends readonly [string, ...string[]]>(
  fields: T,
  defaultField: T[number],
  defaultDirection: SortDirection = 'desc',
) {
  return z.object({
    sortBy: z.enum(fields).default(defaultField),
    sortDirection: sortDirectionSchema.default(defaultDirection),
  });
}

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function buildPaginated<T>(
  items: T[],
  total: number,
  { page, pageSize }: PaginationQuery,
): Paginated<T> {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export const cuidSchema = z
  .string()
  .min(20)
  .max(40)
  .regex(/^[a-z0-9]+$/i, 'Identificador inválido.');
export const idParamSchema = z.object({ id: cuidSchema });
