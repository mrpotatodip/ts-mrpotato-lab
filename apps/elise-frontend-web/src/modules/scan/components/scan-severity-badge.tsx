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

export function ScanSeverityBadge({ severity }: { severity: Severity | null }) {
  if (!severity) return <Badge variant="outline">Unrated</Badge>;
  return (
    <Badge variant="outline" className={cn("capitalize", TONE[severity])}>
      <span className="size-1.5 rounded-full bg-current" />
      {severity}
    </Badge>
  );
}
