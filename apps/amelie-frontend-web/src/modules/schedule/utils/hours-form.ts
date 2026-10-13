import type { HoursFormValues, SpecialDateFormValues } from "../schemas";

type HoursInput = { isClosed: boolean; opensAt: string | null; closesAt: string | null };

export const EMPTY_HOURS_VALUES: HoursFormValues = { isClosed: true, opensAt: "", closesAt: "" };

export const EMPTY_SPECIAL_DATE_VALUES: SpecialDateFormValues = { date: "", note: "", ...EMPTY_HOURS_VALUES };

export const toHoursValues = (hours: HoursInput): HoursFormValues => ({
  isClosed: hours.isClosed,
  opensAt: hours.opensAt ?? "",
  closesAt: hours.closesAt ?? "",
});

// -----
// The hours boxes as a body: a closed day sends no
// times, and a blank time is null.
// -----
export const toHoursBody = (hours: HoursFormValues): HoursInput => ({
  isClosed: hours.isClosed,
  opensAt: hours.isClosed ? null : hours.opensAt || null,
  closesAt: hours.isClosed ? null : hours.closesAt || null,
});

export const toSpecialDateNote = (note: string): string | null => (note.trim() === "" ? null : note.trim());
