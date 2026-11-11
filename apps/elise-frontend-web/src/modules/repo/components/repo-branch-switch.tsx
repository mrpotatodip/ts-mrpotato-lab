import { useNavigate } from "@tanstack/react-router";
import { GitBranch } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import type { RepoBranch } from "../schemas";

type RepoBranchSwitchProps = {
  repoId: string;
  branches: readonly RepoBranch[];
  current: RepoBranch;
};

// -----
// The default branch first, then the most recently scanned, then the
// ones never scanned.
// -----
const byRecent = (a: RepoBranch, b: RepoBranch) => Number(b.isDefault) - Number(a.isDefault) || (b.latestScanAt ?? "").localeCompare(a.latestScanAt ?? "") || a.name.localeCompare(b.name);

const openNote = (branch: RepoBranch) => (branch.latestScanAt === null ? "Never scanned" : branch.open.total === 0 ? "Nothing open" : `${branch.open.total} open`);

export function RepoBranchSwitch({ repoId, branches, current }: RepoBranchSwitchProps) {
  const navigate = useNavigate();
  const sorted = branches.toSorted(byRecent);

  if (branches.length < 2) {
    return (
      <span className="inline-flex min-h-9 w-fit max-w-full items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 font-mono text-sm">
        <GitBranch aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="[overflow-wrap:anywhere]">{current.name}</span>
        {current.isDefault && <span className="font-sans text-xs text-muted-foreground">(default)</span>}
      </span>
    );
  }

  return (
    <Select
      value={current.id}
      items={sorted.map((branch) => ({ value: branch.id, label: branch.name }))}
      onValueChange={(next) => {
        if (next && next !== current.id) void navigate({ to: "/repos/$repoId/branches/$branchId", params: { repoId, branchId: next } });
      }}
    >
      <SelectTrigger aria-label="Switch branch" className="h-9 w-fit max-w-full gap-2 font-mono text-sm">
        <GitBranch aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sorted.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            <span className="grid">
              <span className="font-mono">
                {branch.name}
                {branch.isDefault && <span className="ml-2 font-sans text-xs text-muted-foreground">(default)</span>}
              </span>
              <span className="text-xs text-muted-foreground">{openNote(branch)}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
