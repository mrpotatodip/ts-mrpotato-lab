import { CircleAlert, FolderGit2, History, Undo2 } from "lucide-react";
import { ScanSeverityDots, scanPlural } from "#/modules/scan";
import { ShellStatTile } from "#/modules/shell";
import type { Repo } from "../schemas";
import { repoTotals } from "../utils";

export function RepoSummary({ repos }: { repos: readonly Repo[] }) {
  const totals = repoTotals(repos);

  return (
    <section aria-label="Summary across repositories" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <ShellStatTile
        label="Open findings"
        value={totals.total}
        icon={FolderGit2}
        tone="bg-secondary text-foreground"
        note={
          totals.total === 0 ? (
            `Across ${scanPlural(repos.length, "repository", "repositories")}. Nothing is open.`
          ) : (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <ScanSeverityDots counts={totals.severity} />
            </span>
          )
        }
      />
      <ShellStatTile
        label="Came back"
        value={totals.regressed}
        icon={Undo2}
        tone={totals.regressed > 0 ? "bg-status-danger-soft text-status-danger" : "bg-secondary text-foreground"}
        note={totals.regressed > 0 ? "Fixed before, reported again. Look at these first." : "Nothing that was fixed has returned."}
      />
      <ShellStatTile
        label="Needs a person"
        value={totals.needsValidation}
        icon={CircleAlert}
        tone={totals.needsValidation > 0 ? "bg-status-warning-soft text-status-warning" : "bg-secondary text-foreground"}
        note={totals.needsValidation > 0 ? "Likely but unverified. Check by hand before acting." : "Every open finding was verified."}
      />
      <ShellStatTile
        label="Not re-checked"
        value={totals.unchecked}
        icon={History}
        tone="bg-secondary text-foreground"
        note={totals.unchecked > 0 ? "Open findings the latest scan did not re-verify. Treat them as still open." : "The latest scans re-checked every open finding."}
      />
    </section>
  );
}
