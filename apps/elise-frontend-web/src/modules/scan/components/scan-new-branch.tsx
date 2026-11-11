import { useQuery } from "@tanstack/react-query";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { githubBranchesQuery } from "#/modules/github";
import { SCAN_DEFAULT_BRANCH, SCAN_OTHER_BRANCH } from "../constants";
import { scanRepoBranchesQuery } from "../hooks";
import type { ScanRepoPick } from "../utils";

export type ScanBranches = {
  kind: "engine" | "github" | "typed";
  isPending: boolean;
  isError: boolean;
  defaultBranch: string | null;
  names: string[];
  truncated: boolean;
};

// -----
// Where a repository's branches come from. A private repository reads them
// from GitHub through its connection, because only the connection can see it.
// A public one the account scanned reads them from the engine, which knows
// which were scanned. A pasted link has no list, so the branch is typed.
// -----
export function useScanBranches(pick: ScanRepoPick | null): ScanBranches {
  const fromEngine = pick !== null && pick.repoId !== null && !pick.isPrivate;
  const fromGithub = pick !== null && !fromEngine && pick.connection !== null;
  const engine = useQuery({ ...scanRepoBranchesQuery(pick?.repoId ?? ""), enabled: fromEngine });
  const github = useQuery({ ...githubBranchesQuery(pick?.connection?.installationId ?? "", pick?.connection?.fullName ?? ""), enabled: fromGithub });

  if (fromEngine) {
    const defaultBranch = engine.data?.defaultBranch ?? null;
    return { kind: "engine", isPending: engine.isPending, isError: engine.isError, defaultBranch, names: (engine.data?.branches ?? []).map((branch) => branch.name).filter((name) => name !== defaultBranch), truncated: false };
  }
  if (fromGithub) {
    const defaultBranch = github.data?.defaultBranch ?? null;
    return { kind: "github", isPending: github.isPending, isError: github.isError, defaultBranch, names: (github.data?.branches ?? []).filter((name) => name !== defaultBranch), truncated: github.data?.truncated === true };
  }
  return { kind: "typed", isPending: false, isError: false, defaultBranch: null, names: [], truncated: false };
}

type ScanNewBranchProps = {
  branches: ScanBranches;
  branchPick: string;
  onBranchPick: (pick: string) => void;
};

export function ScanNewBranch({ branches, branchPick, onBranchPick }: ScanNewBranchProps) {
  if (branches.kind === "typed" || branches.isError) return null;
  if (branches.isPending) return <Skeleton className="h-[3.4rem] w-full" />;

  const defaultLabel = branches.defaultBranch === null ? "Default branch" : `${branches.defaultBranch} (default)`;
  const items = [{ value: SCAN_DEFAULT_BRANCH, label: defaultLabel }, ...branches.names.map((name) => ({ value: name, label: name })), { value: SCAN_OTHER_BRANCH, label: "Other…" }];

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="scan-branch" className="text-xs text-muted-foreground">
        Branch
      </Label>
      <Select value={branchPick} items={items} onValueChange={(next) => next !== null && onBranchPick(next)}>
        <SelectTrigger id="scan-branch" title={items.find((item) => item.value === branchPick)?.label} className="h-9 w-full min-w-0 font-mono text-[13px] [&>[data-slot=select-icon]]:shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SCAN_DEFAULT_BRANCH}>{defaultLabel}</SelectItem>
          {branches.names.map((name) => (
            <SelectItem key={name} value={name}>
              <span className="font-mono">{name}</span>
            </SelectItem>
          ))}
          <SelectItem value={SCAN_OTHER_BRANCH}>
            <span className="grid">
              <span>Other…</span>
              <span className="text-xs text-muted-foreground">Type the exact name of a branch, tag or commit.</span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
