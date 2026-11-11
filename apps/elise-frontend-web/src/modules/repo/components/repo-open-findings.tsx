import { Badge } from "#/components/ui/badge";
import { ScanSeverityDots } from "#/modules/scan";
import { scanPlural } from "#/modules/scan";
import type { Repo } from "../schemas";

export function RepoOpenFindings({ open }: { open: Repo["open"] }) {
  if (open.total === 0) return <span className="text-muted-foreground">Nothing open</span>;

  return (
    <span className="grid gap-1">
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium tabular-nums">{open.total} open</span>
        <ScanSeverityDots counts={open.severity} />
      </span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {open.regressed > 0 && <Badge variant="destructive">{open.regressed} came back</Badge>}
        {open.needsValidation > 0 && <span className="text-xs text-status-warning">{open.needsValidation} to check by hand</span>}
        {open.unchecked > 0 && <span className="text-xs text-muted-foreground">{scanPlural(open.unchecked, "finding", "findings")} not re-checked</span>}
      </span>
    </span>
  );
}
