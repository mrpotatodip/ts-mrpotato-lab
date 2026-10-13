import type { TenantHours } from "@repo/contracts/amelie";

export const withoutSpecialDate = (hours: TenantHours, date: string): TenantHours => ({
  ...hours,
  specialDates: hours.specialDates.filter((day) => day.date !== date),
});
