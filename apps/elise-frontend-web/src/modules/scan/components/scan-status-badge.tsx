import { Badge } from "#/components/ui/badge";
import type { ScanState } from "../schemas";

const VARIANT = {
  queued: "secondary",
  running: "default",
  succeeded: "outline",
  failed: "destructive",
} as const;

export function ScanStatusBadge({ status }: { status: ScanState }) {
  return <Badge variant={VARIANT[status]}>{status}</Badge>;
}
