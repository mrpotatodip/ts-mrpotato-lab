const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const stableWeekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type DashboardActivityDay = { day: string; count: number };

// -----
// One bar per day, oldest first, ending today.
// Days with no chats still get a bar of zero. With
// stable, days start at UTC midnight and read in en-US,
// the same on the server and in the browser.
// -----
export function countByDay(isoDates: string[], days: number, stable = false): DashboardActivityDay[] {
  const today = new Date();
  if (stable) today.setUTCHours(0, 0, 0, 0);
  else today.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: days }, (_, index) => {
    const start = new Date(today);
    const back = days - 1 - index;
    if (stable) start.setUTCDate(today.getUTCDate() - back);
    else start.setDate(today.getDate() - back);
    return { day: (stable ? stableWeekday : weekday).format(start), start: start.getTime(), count: 0 };
  });

  for (const iso of isoDates) {
    const time = Date.parse(iso);
    const bucket = buckets.findLast((candidate) => candidate.start <= time);
    if (bucket && time >= buckets[0].start) bucket.count += 1;
  }

  return buckets.map(({ day, count }) => ({ day, count }));
}

// -----
// "5 minutes ago", "yesterday": how long since the
// Customer last wrote.
// -----
export function formatRelativeTime(iso: string): string {
  const elapsed = Date.parse(iso) - new Date().getTime();
  const abs = Math.abs(elapsed);
  if (abs < HOUR_MS) return relative.format(Math.round(elapsed / MINUTE_MS), "minute");
  if (abs < DAY_MS) return relative.format(Math.round(elapsed / HOUR_MS), "hour");
  return relative.format(Math.round(elapsed / DAY_MS), "day");
}
