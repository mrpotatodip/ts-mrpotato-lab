import { hydratedTimeZone, useHydrated } from "#/lib/use-hydrated";

const format = (timeZone: string | undefined) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone });

export function ScanTime({ value }: { value: string | null | undefined }) {
  const hydrated = useHydrated();
  if (!value) return <span className="text-muted-foreground">-</span>;
  return (
    <time dateTime={value} className="tabular-nums text-muted-foreground">
      {format(hydratedTimeZone(hydrated)).format(new Date(value))}
    </time>
  );
}
