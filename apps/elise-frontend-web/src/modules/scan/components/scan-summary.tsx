import { Card } from "#/components/ui/card";
import { ShellStatCell } from "#/modules/shell";
import { SEVERITIES, type ScanStatus } from "../schemas";
import { scanCost, scanDuration, scanPlural, scanTokens } from "../utils";

// -----
// The same strip as the repository summary: one card, one lead number, no icon
// chips or tints. The cost cell is there only when usage was recorded.
// -----
export function ScanSummary({ scan }: { scan: ScanStatus }) {
  const { summary, usage } = scan;
  if (!summary && !usage) return null;

  const severityParts = summary ? SEVERITIES.filter((s) => summary.severity[s] > 0).map((s) => `${summary.severity[s]} ${s}`) : [];
  const duration = scanDuration(usage?.durationMs);
  const tokens = usage ? usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheWriteTokens : 0;

  return (
    <section aria-label="Scan summary">
      <Card className="grid divide-y lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        {summary && (
          <>
            <ShellStatCell
              lead
              label="Findings"
              value={summary.total}
              note={summary.total === 0 ? "Nothing was reported. That does not prove the code is safe." : severityParts.length > 0 ? `${severityParts.join(", ")} confirmed.` : "None confirmed yet."}
            />
            <ShellStatCell
              label="Needs a person"
              value={summary.needsValidation}
              note={summary.needsValidation > 0 ? `${scanPlural(summary.needsValidation, "finding is", "findings are")} likely but unverified. Check by hand before acting.` : "Every finding was verified by the agent."}
            />
            <ShellStatCell label="New since last scan" value={summary.new} note={`${summary.carried} carried over from earlier scans and seen again. The rest of this page shows what changed.`} />
          </>
        )}
        {usage && (
          <ShellStatCell
            label="What it cost"
            value={scanCost(usage.costUsd)}
            note={[duration && `Took ${duration}`, tokens > 0 && `${scanTokens(tokens)} tokens`, usage.turns !== null && `${usage.turns} turns`].filter(Boolean).join(", ") + ". Estimated at list price."}
          />
        )}
      </Card>
    </section>
  );
}
