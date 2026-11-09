import type { ReactNode } from "react";
import { Card } from "#/components/ui/card";
import { cn } from "#/lib/utils";
import { ScanSeverityDots, scanPlural } from "#/modules/scan";
import type { Repo } from "../schemas";
import { repoTotals } from "../utils";

type CellProps = { label: string; value: number; note: ReactNode; lead?: boolean };

function Cell({ label, value, note, lead }: CellProps) {
  return (
    <div className="grid content-start gap-3 p-6">
      <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
      <p className={cn("font-semibold leading-none tracking-tight tabular-nums", lead ? "text-[40px]" : "text-[32px]", value === 0 && "text-muted-foreground")}>{value}</p>
      <div className="text-sm leading-relaxed text-muted-foreground">{note}</div>
    </div>
  );
}

// -----
// The same four answers as the repository summary, as one card with one lead
// number instead of four equal tiles: most of the time three of them are 0, and
// four boxes of equal weight hide the one that is not. No icon chips and no
// tints: colour belongs to the findings themselves (the severity dots).
// -----
export function RepoSummaryStrip({ repos }: { repos: readonly Repo[] }) {
  const totals = repoTotals(repos);

  return (
    <section aria-label="Summary across repositories">
      <Card className="grid divide-y lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        <Cell
          lead
          label="Open findings"
          value={totals.total}
          note={totals.total === 0 ? `Across ${scanPlural(repos.length, "repository", "repositories")}. Nothing is open.` : <ScanSeverityDots counts={totals.severity} />}
        />
        <Cell label="Came back" value={totals.regressed} note={totals.regressed > 0 ? "Fixed before, reported again. Look at these first." : "Nothing that was fixed has returned."} />
        <Cell label="Needs a person" value={totals.needsValidation} note={totals.needsValidation > 0 ? "Likely but unverified. Check by hand before acting." : "Every open finding was verified."} />
        <Cell label="Not re-checked" value={totals.unchecked} note={totals.unchecked > 0 ? "Open findings the latest scan did not re-verify. Treat them as still open." : "The latest scans re-checked every open finding."} />
      </Card>
    </section>
  );
}
