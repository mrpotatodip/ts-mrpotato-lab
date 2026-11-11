import { Card } from "#/components/ui/card";
import { ShellStatCell as Cell } from "#/modules/shell";
import { ScanSeverityDots, scanPlural } from "#/modules/scan";
import type { Repo } from "../schemas";
import { repoTotals } from "../utils";

// -----
// The same four answers as the repository summary, as one card with one lead
// number instead of four equal tiles: most of the time three of them are 0, and
// four boxes of equal weight hide the one that is not. No icon chips and no
// tints: colour belongs to the findings themselves (the severity dots).
// -----
export function RepoSummaryStrip({ repos }: { repos: readonly Repo[] }) {
  const totals = repoTotals(repos);
  const notRated = totals.total - Object.values(totals.severity).reduce((sum, count) => sum + count, 0);

  return (
    <section aria-label="Summary across repositories">
      <Card className="grid divide-y lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        <Cell
          lead
          label="Open findings"
          value={totals.total}
          note={
            totals.total === 0 ? (
              `Across ${scanPlural(repos.length, "repository", "repositories")}. Nothing is open.`
            ) : (
              <>
                <ScanSeverityDots counts={totals.severity} />
                {notRated > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span aria-hidden="true" className="size-1.5 rounded-full border border-muted-foreground" />
                    <span className="tabular-nums">{notRated}</span> not rated
                  </span>
                )}
              </>
            )
          }
        />
        <Cell label="Came back" value={totals.regressed} note={totals.regressed > 0 ? "Fixed before, reported again. Look at these first." : "Nothing that was fixed has returned."} />
        <Cell label="Needs a person" value={totals.needsValidation} note={totals.needsValidation > 0 ? "Likely but unverified. Check by hand before acting." : "Every open finding was verified."} />
        <Cell label="Not re-checked" value={totals.unchecked} note={totals.unchecked > 0 ? "Open findings the latest scan did not re-verify. Treat them as still open." : "The latest scans re-checked every open finding."} />
      </Card>
    </section>
  );
}
