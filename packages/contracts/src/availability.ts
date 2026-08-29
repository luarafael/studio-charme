import { z } from 'zod';
import { isoDateSchema, timeOfDaySchema } from './datetime.js';
import { availabilityTypeSchema, type AvailabilityType } from './enums.js';
import { uuidSchema } from './agenda.js';
import type { MinuteRange } from './scheduling.js';

export const weekdaySchema = z.number().int().min(0).max(6);
export const minuteOfDaySchema = z.number().int().min(0).max(24 * 60);

export const businessHourSchema = z
  .object({
    weekday: weekdaySchema,
    startMinute: minuteOfDaySchema,
    endMinute: minuteOfDaySchema,
  })
  .refine((row) => row.endMinute > row.startMinute, {
    message: 'O horário final precisa ser depois do início.',
    path: ['endMinute'],
  });
export type BusinessHourDto = z.infer<typeof businessHourSchema>;

export const replaceBusinessHoursBodySchema = z.object({
  hours: z.array(businessHourSchema).max(14),
});
export type ReplaceBusinessHoursBody = z.infer<typeof replaceBusinessHoursBodySchema>;

export const availabilityOverrideSchema = z.object({
  id: uuidSchema,
  type: availabilityTypeSchema,
  date: isoDateSchema,
  startMinute: minuteOfDaySchema.nullable(),
  endMinute: minuteOfDaySchema.nullable(),
  reason: z.string().nullable(),
});
export type AvailabilityOverrideDto = z.infer<typeof availabilityOverrideSchema>;

export const createAvailabilityOverrideBodySchema = z
  .object({
    type: availabilityTypeSchema,
    date: isoDateSchema,
    startMinute: minuteOfDaySchema.optional(),
    endMinute: minuteOfDaySchema.optional(),
    reason: z.string().trim().max(200).optional(),
  })
  .refine(
    (data) =>
      (data.startMinute === undefined && data.endMinute === undefined) ||
      (data.startMinute !== undefined &&
        data.endMinute !== undefined &&
        data.endMinute > data.startMinute),
    { message: 'Informe início e fim, com o fim depois do início.', path: ['endMinute'] },
  );
export type CreateAvailabilityOverrideBody = z.infer<typeof createAvailabilityOverrideBodySchema>;

export type DayOverride = {
  type: AvailabilityType;
  startMinute: number | null;
  endMinute: number | null;
};

export type ResolvedDaySchedule =
  | { closed: true; ranges: []; extraBusy: [] }
  | { closed: false; ranges: MinuteRange[]; extraBusy: MinuteRange[] };

/**
 * Junta jornada da semana com folgas, bloqueios, intervalos e extras do dia.
 * Folga ou bloqueio sem horário fecha o dia inteiro.
 */
export function resolveDaySchedule(
  weekdayRanges: readonly MinuteRange[],
  overrides: readonly DayOverride[],
): ResolvedDaySchedule {
  const closesDay = overrides.some(
    (item) =>
      (item.type === 'TIME_OFF' || item.type === 'BLOCK') &&
      item.startMinute === null &&
      item.endMinute === null,
  );
  if (closesDay) {
    return { closed: true, ranges: [], extraBusy: [] };
  }

  const ranges: MinuteRange[] = [...weekdayRanges];
  const extraBusy: MinuteRange[] = [];

  for (const item of overrides) {
    if (item.startMinute === null || item.endMinute === null) continue;
    const range = { startMinute: item.startMinute, endMinute: item.endMinute };
    if (item.type === 'EXTRA') ranges.push(range);
    if (item.type === 'BREAK' || item.type === 'BLOCK' || item.type === 'TIME_OFF') {
      extraBusy.push(range);
    }
  }

  return { closed: false, ranges, extraBusy };
}

export const publicAvailabilityQuerySchema = z.object({
  slug: z.string().trim().min(2).max(40),
  date: isoDateSchema,
  serviceId: uuidSchema,
});

export const publicSlotSchema = z.object({
  time: timeOfDaySchema,
});

export const publicAvailabilitySchema = z.object({
  date: isoDateSchema,
  closed: z.boolean(),
  slots: z.array(publicSlotSchema),
});
export type PublicAvailabilityDto = z.infer<typeof publicAvailabilitySchema>;

export const publicServiceSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  category: z.string(),
  durationMinutes: z.number().int(),
});

export const publicProfessionalCatalogSchema = z.object({
  slug: z.string(),
  name: z.string(),
  role: z.string(),
  hasHours: z.boolean(),
  services: z.array(publicServiceSchema),
});

export const publicCatalogSchema = z.object({
  professionals: z.array(publicProfessionalCatalogSchema),
});
export type PublicCatalogDto = z.infer<typeof publicCatalogSchema>;
