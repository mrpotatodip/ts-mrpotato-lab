import { Badge } from "#/components/ui/badge";
import type { Severity } from "../schemas";

const VARIANT = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
  informational: "outline",
} as const;

export function ScanSeverityBadge({ severity }: { severity: Severity | null }) {
  if (!severity) return <Badge variant="outline">unrated</Badge>;
  return <Badge variant={VARIANT[severity]}>{severity}</Badge>;
}
