import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";
import type { ScanState } from "../schemas";

const VARIANT = {
  queued: "neutral",
  running: "info",
  succeeded: "success",
  failed: "destructive",
} as const;

const LABEL = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
} as const;

export function ScanStatusBadge({ status }: { status: ScanState }) {
  return (
    <Badge variant={VARIANT[status]}>
      <span className={cn("size-1.5 rounded-full bg-current", status === "running" && "animate-pulse")} />
      {LABEL[status]}
    </Badge>
  );
}
