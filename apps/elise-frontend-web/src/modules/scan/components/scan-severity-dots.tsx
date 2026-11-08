import { cn } from "#/lib/utils";
import { SEVERITIES, type SeverityCounts } from "../schemas";

const DOT = {
  critical: "bg-severity-critical",
  high: "bg-severity-high",
  medium: "bg-severity-medium",
  low: "bg-severity-low",
  informational: "bg-severity-informational",
} as const;

export function ScanSeverityDots({ counts }: { counts: SeverityCounts }) {
  return (
    <>
      {SEVERITIES.filter((s) => counts[s] > 0).map((s) => (
        <span key={s} className="flex items-center gap-1 text-xs capitalize text-muted-foreground">
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", DOT[s])} />
          <span className="tabular-nums">{counts[s]}</span> {s}
        </span>
      ))}
    </>
  );
}
