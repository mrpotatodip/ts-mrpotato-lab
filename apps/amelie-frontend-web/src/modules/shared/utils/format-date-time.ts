const OPTIONS = { dateStyle: "medium", timeStyle: "short" } as const;

const viewer = new Intl.DateTimeFormat(undefined, OPTIONS);
const stable = new Intl.DateTimeFormat("en-US", { ...OPTIONS, timeZone: "UTC" });

// -----
// "Jan 5, 2026, 3:04 PM". The viewer's own zone and
// locale, or with stable set a fixed UTC and en-US form
// that reads the same on the server and in the browser.
// -----
export function formatDateTime(iso: string, stableForHydration = false): string {
  return (stableForHydration ? stable : viewer).format(new Date(iso));
}
