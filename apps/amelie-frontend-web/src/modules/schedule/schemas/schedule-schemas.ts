import { z } from "zod";
import { HoursDateSchema, LocationIdSchema, SpecialDateSchema, TenantHoursSchema, WeeklyHoursSchema } from "@repo/contracts/amelie";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const TenantHoursResponseSchema = apiResponseSchema(TenantHoursSchema);
export const WeeklyHoursResponseSchema = apiResponseSchema(WeeklyHoursSchema);
export const SpecialDateResponseSchema = apiResponseSchema(SpecialDateSchema);
export const RemovedSpecialDateResponseSchema = apiResponseSchema(z.object({ date: z.string() }));

export const SetWeeklyHoursInputSchema = z.object({
  locationId: LocationIdSchema.optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  isClosed: z.boolean(),
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
});

export const SetSpecialDateInputSchema = z.object({
  locationId: LocationIdSchema.optional(),
  date: HoursDateSchema,
  isClosed: z.boolean(),
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  note: z.string().nullable(),
});

export const RemoveSpecialDateInputSchema = z.object({ date: HoursDateSchema, locationId: LocationIdSchema.optional() });

export type SetWeeklyHoursInput = z.infer<typeof SetWeeklyHoursInputSchema>;
export type SetSpecialDateInput = z.infer<typeof SetSpecialDateInputSchema>;
export type RemoveSpecialDateInput = z.infer<typeof RemoveSpecialDateInputSchema>;

// -----
// What the hours boxes hold: times as typed, "" for a
// blank. The contract bodies do the real checks.
// -----
export const HoursFormValuesSchema = z.object({
  isClosed: z.boolean(),
  opensAt: z.string(),
  closesAt: z.string(),
});

export const SpecialDateFormValuesSchema = HoursFormValuesSchema.extend({
  date: z.string(),
  note: z.string(),
});

export type HoursFormValues = z.infer<typeof HoursFormValuesSchema>;
export type SpecialDateFormValues = z.infer<typeof SpecialDateFormValuesSchema>;
