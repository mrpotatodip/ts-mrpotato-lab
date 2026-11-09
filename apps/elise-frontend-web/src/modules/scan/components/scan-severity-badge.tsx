import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";
import type { Severity } from "../schemas";

const TONE = {
  critical: "border-severity-critical/30 bg-severity-critical/12 text-severity-critical",
  high: "border-severity-high/30 bg-severity-high/12 text-severity-high",
  medium: "border-severity-medium/30 bg-severity-medium/12 text-severity-medium",
  low: "border-severity-low/30 bg-severity-low/12 text-severity-low",
  informational: "border-severity-informational/30 bg-severity-informational/12 text-severity-informational",
} as const;

const MEANING = {
  critical: "Very serious. Fix it before shipping.",
  high: "Serious. Fix it before shipping.",
  medium: "Worth fixing. A few can be shipped with.",
  low: "Minor. It does not block shipping.",
  informational: "Good to know. It does not block shipping.",
} as const satisfies Record<Severity, string>;

export function ScanSeverityBadge({ severity }: { severity: Severity | null }) {
  if (!severity)
    return (
      <Badge variant="outline" title="Not rated yet. A person has to check it and decide how serious it is.">
        Unrated
      </Badge>
    );
  return (
    <Badge variant="outline" title={MEANING[severity]} className={cn("capitalize", TONE[severity])}>
      <span className="size-1.5 rounded-full bg-current" />
      {severity}
    </Badge>
  );
}
