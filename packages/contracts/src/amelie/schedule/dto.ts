import { z } from "zod";

// -----
// Requests: a real date, 24-hour HH:MM, and
// times only when open
// -----
export const HoursDateSchema = z.iso.date();
export const HoursTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const HoursFields = {
  isClosed: z.boolean(),
  opensAt: HoursTimeSchema.nullable(),
  closesAt: HoursTimeSchema.nullable(),
};

export const checkOpeningTimes = (
  hours: { isClosed: boolean; opensAt: string | null; closesAt: string | null },
  ctx: z.RefinementCtx,
): void => {
  if (hours.isClosed) {
    if (hours.opensAt !== null || hours.closesAt !== null) {
      ctx.addIssue({ code: "custom", message: "a closed day has no times" });
    }
    return;
  }
  if (hours.opensAt === null || hours.closesAt === null) {
    ctx.addIssue({ code: "custom", message: "an open day needs opensAt and closesAt" });
    return;
  }
  if (hours.opensAt >= hours.closesAt) {
    ctx.addIssue({ code: "custom", message: "opensAt must be before closesAt" });
  }
};

export const WeekdayParamSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
});

export const OverrideDateParamSchema = z.object({
  date: HoursDateSchema,
});

export const SetWeeklyHoursBodySchema = z.object(HoursFields).superRefine(checkOpeningTimes);

export const SetHoursOverrideBodySchema = z
  .object({
    ...HoursFields,
    note: z.string().trim().min(1).max(120).nullable(),
  })
  .superRefine(checkOpeningTimes);

// -----
// Responses: the weekly hours, and the special
// dates coming up, in the Tenant's timezone
// -----
export const WeeklyHoursSchema = z.object({
  weekday: z.string(),
  isSet: z.boolean(),
  isClosed: z.boolean(),
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
});

export const SpecialDateSchema = z.object({
  date: z.string(),
  isClosed: z.boolean(),
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  note: z.string().nullable(),
});

export const TenantHoursSchema = z.object({
  timezone: z.string(),
  weekly: z.array(WeeklyHoursSchema),
  specialDates: z.array(SpecialDateSchema),
});

export type WeekdayParam = z.infer<typeof WeekdayParamSchema>;
export type OverrideDateParam = z.infer<typeof OverrideDateParamSchema>;
export type SetWeeklyHoursBody = z.infer<typeof SetWeeklyHoursBodySchema>;
export type SetHoursOverrideBody = z.infer<typeof SetHoursOverrideBodySchema>;
export type WeeklyHours = z.infer<typeof WeeklyHoursSchema>;
export type SpecialDate = z.infer<typeof SpecialDateSchema>;
export type TenantHours = z.infer<typeof TenantHoursSchema>;
