import type { ReactNode } from "react";
import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";
import { ScanTime } from "#/modules/scan";
import type { FindingState, FindingTriage } from "../schemas";
import { FINDING_STATUS_BADGE, findingStatusKey } from "../utils";

type FindingStatusProps = {
  state: FindingState;
  triage: FindingTriage | null;
  fixedOn?: string | null;
};

const whoOf = (triage: FindingTriage | null) => triage?.decidedBy ?? "a team member";

const isExpired = (triage: FindingTriage | null) => triage?.status === "accepted_risk" && triage.acceptedUntil !== null && new Date(triage.acceptedUntil) < new Date();

export function FindingStatusBadge({ state, triage }: Pick<FindingStatusProps, "state" | "triage">) {
  const badge = FINDING_STATUS_BADGE[findingStatusKey(state, triage)];
  return <Badge variant={badge.variant}>{badge.label}</Badge>;
}

// -----
// One short line under the decision select: who decided, and when. It is only
// there when a person or a scan settled the finding.
// -----
export function FindingDecisionNote({ state, triage, fixedOn }: FindingStatusProps) {
  const key = findingStatusKey(state, triage);
  if (key === "open" || key === "came_back") return null;

  let first: ReactNode = `By ${whoOf(triage)}`;
  let second: ReactNode = <ScanTime value={triage?.updatedAt} />;
  if (key === "fixed_by_scan") {
    first = "Confirmed by a scan";
    second = fixedOn ? <ScanTime value={fixedOn} /> : null;
  } else if (key === "accepted_risk" && triage?.acceptedUntil) {
    second = isExpired(triage) ? (
      <span className="text-status-danger">
        Ran out <ScanTime value={triage.acceptedUntil} />
      </span>
    ) : (
      <>
        Until <ScanTime value={triage.acceptedUntil} />
      </>
    );
  }

  return (
    <span className="grid gap-0.5 text-xs text-muted-foreground">
      <span>{first}</span>
      {second && <span className="whitespace-nowrap">{second}</span>}
      {key === "marked_fixed" && <span>Not confirmed by a scan yet</span>}
    </span>
  );
}

const TONE = {
  success: "border-status-success/25 bg-status-success-soft text-status-success",
  warning: "border-status-warning/25 bg-status-warning-soft text-status-warning",
  danger: "border-status-danger/25 bg-status-danger-soft text-status-danger",
  neutral: "border-border bg-muted/50 text-foreground",
} as const;

type Banner = { tone: keyof typeof TONE; title: ReactNode; body: ReactNode };

function bannerOf({ state, triage, fixedOn }: FindingStatusProps): Banner {
  const key = findingStatusKey(state, triage);
  const who = whoOf(triage);
  const when = <ScanTime value={triage?.updatedAt} />;

  switch (key) {
    case "fixed_by_scan":
      return {
        tone: "success",
        title: "Fixed by a scan",
        body: <>A scan{fixedOn ? <> on <ScanTime value={fixedOn} /></> : null} checked the code and the problem is gone. No decision is needed.</>,
      };
    case "marked_fixed":
      return {
        tone: "neutral",
        title: `Marked fixed by ${who}`,
        body: <>{when}. No scan has confirmed it yet. If a later scan finds it again, it will show as Came back.</>,
      };
    case "false_positive":
      return { tone: "neutral", title: `Dismissed as a false positive by ${who}`, body: <>{when}. It no longer counts as open.</> };
    case "accepted_risk":
      return isExpired(triage)
        ? {
            tone: "danger",
            title: "The accepted risk has run out",
            body: <>{who} accepted it until <ScanTime value={triage?.acceptedUntil} />. The Verdict counts it as open again. Decide again to extend it.</>,
          }
        : {
            tone: "warning",
            title: `Risk accepted by ${who}`,
            body: <>Until <ScanTime value={triage?.acceptedUntil} />. After that it blocks the Verdict again.</>,
          };
    case "came_back":
      return { tone: "danger", title: "Came back", body: "It was fixed before and a scan reported it again. Find what reintroduced it, then decide below." };
    default:
      return { tone: "neutral", title: "Open: nobody has decided yet", body: "Choose a decision below. Marking it fixed does not confirm the fix: only a scan can do that." };
  }
}

// -----
// The answer to "where does this finding stand?", stated first in the sheet:
// what happened, who did it, when, and what it means from here.
// -----
export function FindingStatusBanner(props: FindingStatusProps) {
  const { tone, title, body } = bannerOf(props);
  const reason = props.triage?.note?.trim();

  return (
    <div className={cn("grid gap-1.5 rounded-lg border px-4 py-3", TONE[tone])}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-sm leading-relaxed text-foreground">{body}</p>
      {reason && (
        <p className="text-sm leading-relaxed text-foreground">
          <span className="font-medium">{props.triage?.status === "accepted_risk" ? "Reason: " : "Note: "}</span>
          {reason}
        </p>
      )}
    </div>
  );
}
