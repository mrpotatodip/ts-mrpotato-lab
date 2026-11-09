import { CircleCheck } from "lucide-react";
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

// -----
// A summary list shows the exceptions in colour. A scan that simply succeeded
// is the normal case, so `quiet` shows it as plain muted text; running, queued
// and failed keep their pills.
// -----
export function ScanStatusBadge({ status, quiet = false }: { status: ScanState; quiet?: boolean }) {
  if (quiet && status === "succeeded") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <CircleCheck aria-hidden="true" className="size-3.5" />
        {LABEL[status]}
      </span>
    );
  }
  return (
    <Badge variant={VARIANT[status]}>
      <span className={cn("size-1.5 rounded-full bg-current", status === "running" && "animate-pulse")} />
      {LABEL[status]}
    </Badge>
  );
}
