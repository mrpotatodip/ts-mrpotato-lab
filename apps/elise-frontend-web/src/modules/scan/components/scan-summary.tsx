import { CircleAlert, Coins, GitCompareArrows, ListChecks } from "lucide-react";
import { ShellStatTile } from "#/modules/shell";
import { SEVERITIES, type ScanStatus } from "../schemas";
import { scanCost, scanDuration, scanPlural, scanTokens } from "../utils";

export function ScanSummary({ scan }: { scan: ScanStatus }) {
  const { summary, usage } = scan;
  if (!summary && !usage) return null;

  const severityParts = summary ? SEVERITIES.filter((s) => summary.severity[s] > 0).map((s) => `${summary.severity[s]} ${s}`) : [];
  const duration = scanDuration(usage?.durationMs);
  const tokens = usage ? usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheWriteTokens : 0;

  return (
    <section aria-label="Scan summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {summary && (
        <>
          <ShellStatTile
            label="Findings"
            value={summary.total}
            icon={ListChecks}
            tone="bg-secondary text-foreground"
            note={summary.total === 0 ? "Nothing was reported. That does not prove the code is safe." : severityParts.length > 0 ? `${severityParts.join(", ")} confirmed.` : "None confirmed yet."}
          />
          <ShellStatTile
            label="Needs a person"
            value={summary.needsValidation}
            icon={CircleAlert}
            tone={summary.needsValidation > 0 ? "bg-status-warning-soft text-status-warning" : "bg-secondary text-foreground"}
            note={summary.needsValidation > 0 ? `${scanPlural(summary.needsValidation, "finding is", "findings are")} likely but unverified. Check by hand before acting.` : "Every finding was verified by the agent."}
          />
          <ShellStatTile
            label="New since last scan"
            value={summary.new}
            icon={GitCompareArrows}
            tone="bg-secondary text-foreground"
            note={`${summary.carried} carried over from earlier scans and seen again. The rest of this page shows what changed.`}
          />
        </>
      )}
      {usage && (
        <ShellStatTile
          label="What it cost"
          value={scanCost(usage.costUsd)}
          icon={Coins}
          tone="bg-secondary text-foreground"
          note={[duration && `Took ${duration}`, tokens > 0 && `${scanTokens(tokens)} tokens`, usage.turns !== null && `${usage.turns} turns`].filter(Boolean).join(", ") + ". Estimated at list price."}
        />
      )}
    </section>
  );
}
