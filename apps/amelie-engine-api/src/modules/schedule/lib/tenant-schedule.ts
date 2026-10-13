import { SCHEDULE_DAYS, SCHEDULE_WEEKDAYS } from "#/modules/schedule/constants";
import type { TenantClock } from "#/modules/tenant";
import type {
  BusinessHours,
  HoursOverride,
  ScheduleDay,
  SpecialDate,
  WeeklyHours,
} from "#/modules/schedule/types";

const hhmm = (time: string | null) => (time ?? "").slice(0, 5);

const addDays = (date: string, days: number) => {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
};

// -----
// Real dates from today: a special date
// replaces that day's weekly hours.
// -----
export const buildTenantSchedule = (
  hours: BusinessHours[],
  overrides: HoursOverride[],
  today: string,
): ScheduleDay[] =>
  Array.from({ length: SCHEDULE_DAYS }, (_, offset) => {
    const date = addDays(today, offset);
    const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
    const override = overrides.find((o) => o.date === date);
    const weekly = hours.find((h) => h.dayOfWeek === dayOfWeek);
    const source = override ?? weekly;
    return {
      date,
      weekday: SCHEDULE_WEEKDAYS[dayOfWeek],
      isSet: Boolean(source),
      isClosed: source?.isClosed ?? false,
      opensAt: source && !source.isClosed ? hhmm(source.opensAt) : null,
      closesAt: source && !source.isClosed ? hhmm(source.closesAt) : null,
      note: override?.note ?? null,
      isSpecial: Boolean(override),
    };
  });

// -----
// Open or closed right now, whether it opened
// today at all, and when it next opens.
// -----
export const describeOpenNow = (schedule: ScheduleDay[], clock: TenantClock): string => {
  const [today, ...later] = schedule;
  if (!today?.isSet) return "today's hours are not set";
  if (today.opensAt && today.closesAt) {
    if (clock.time >= today.opensAt && clock.time < today.closesAt) {
      return `open now, until ${today.closesAt}`;
    }
    if (clock.time < today.opensAt) return `closed now, opens today at ${today.opensAt}`;
  }
  const closedNow = today.closesAt ? `closed now, closed at ${today.closesAt} today` : "closed all day today";
  const next = later.find((day) => day.opensAt);
  return next
    ? `${closedNow}, opens ${next.weekday} ${next.date} at ${next.opensAt}`
    : `${closedNow}, with no opening set in the next 7 days`;
};

// -----
// Sunday to Saturday; a day with no row
// is "not set", not closed.
// -----
export const buildWeeklyHours = (hours: BusinessHours[]): WeeklyHours[] =>
  SCHEDULE_WEEKDAYS.map((weekday, dayOfWeek) => {
    const day = hours.find((h) => h.dayOfWeek === dayOfWeek);
    return {
      weekday,
      isSet: Boolean(day),
      isClosed: day?.isClosed ?? false,
      opensAt: day && !day.isClosed ? hhmm(day.opensAt) : null,
      closesAt: day && !day.isClosed ? hhmm(day.closesAt) : null,
    };
  });

export const toSpecialDates = (overrides: HoursOverride[]): SpecialDate[] =>
  overrides.map((o) => ({
    date: o.date,
    isClosed: o.isClosed,
    opensAt: o.isClosed ? null : hhmm(o.opensAt),
    closesAt: o.isClosed ? null : hhmm(o.closesAt),
    note: o.note,
  }));
