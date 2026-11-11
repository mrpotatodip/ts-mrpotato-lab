import { hydratedTimeZone, useHydrated } from "#/lib/use-hydrated";

const format = (timeZone: string | undefined) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone });

export function ScanTime({ value, utc = false }: { value: string | null | undefined; utc?: boolean }) {
  const hydrated = useHydrated();
  if (!value) return <span className="text-muted-foreground">-</span>;
  return (
    <time dateTime={value} className="tabular-nums text-muted-foreground">
      {format(utc ? "UTC" : hydratedTimeZone(hydrated)).format(new Date(value))}
    </time>
  );
}
