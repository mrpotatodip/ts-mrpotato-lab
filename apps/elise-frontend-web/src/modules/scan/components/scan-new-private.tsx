import { Suspense } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { githubBranchesQuery, githubInstallationsQuery, githubReposQuery, type GithubRepo } from "#/modules/github";
import {
  SCAN_DEFAULT_BRANCH,
  SCAN_OTHER_BRANCH,
  SCAN_PRIVATE_BRANCH_FAILED,
  SCAN_PRIVATE_EMPTY,
  SCAN_PRIVATE_NONE_BODY,
  SCAN_PRIVATE_NONE_TITLE,
  SCAN_PRIVATE_REPO_HINT,
  SCAN_PRIVATE_TRUNCATED,
} from "../constants";

const NONE = "none";

type ScanNewPrivateProps = {
  repo: GithubRepo | undefined;
  branchPick: string;
  typedRef: string | undefined;
  onRepo: (repo: GithubRepo) => void;
  onBranchPick: (pick: string) => void;
  onTypedRef: (ref: string | undefined) => void;
};

type ScanNewPrivateBranchesProps = Pick<ScanNewPrivateProps, "branchPick" | "typedRef" | "onBranchPick" | "onTypedRef"> & { repo: GithubRepo };

function ScanNewPrivateBranches({ repo, branchPick, typedRef, onBranchPick, onTypedRef }: ScanNewPrivateBranchesProps) {
  const { data, isPending, isError } = useQuery(githubBranchesQuery(repo.installationId, repo.fullName));

  if (isPending) return <Skeleton className="h-10 w-full" />;
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{SCAN_PRIVATE_BRANCH_FAILED}</AlertDescription>
      </Alert>
    );
  }

  const items = [
    { value: SCAN_DEFAULT_BRANCH, label: "Default branch" },
    ...data.branches.map((branch) => ({ value: branch, label: branch })),
    { value: SCAN_OTHER_BRANCH, label: "Other…" },
  ];

  return (
    <>
      <Label htmlFor="private-branch-pick" className="mt-2">
        Which branch should we audit?
      </Label>
      <Select value={branchPick} items={items} onValueChange={(next) => next !== null && onBranchPick(next)}>
        <SelectTrigger id="private-branch-pick">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SCAN_DEFAULT_BRANCH}>
            <span className="grid">
              <span>Default branch</span>
              <span className="text-xs text-muted-foreground">{data.defaultBranch}</span>
            </span>
          </SelectItem>
          {data.branches
            .filter((branch) => branch !== data.defaultBranch)
            .map((branch) => (
              <SelectItem key={branch} value={branch}>
                <span className="font-mono">{branch}</span>
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
      {data.truncated && <p className="text-xs text-muted-foreground">{SCAN_PRIVATE_TRUNCATED}</p>}
      {branchPick === SCAN_OTHER_BRANCH && (
        <>
          <Label htmlFor="private-ref" className="mt-2">
            Branch name or commit
          </Label>
          <Input id="private-ref" className="font-mono" autoComplete="off" placeholder="Leave empty for the default branch" value={typedRef ?? ""} onChange={(event) => onTypedRef(event.target.value === "" ? undefined : event.target.value)} />
          <p className="text-xs text-muted-foreground">Capital letters count. A branch, tag or commit of the repository.</p>
        </>
      )}
    </>
  );
}

function ScanNewPrivateView({ repo, branchPick, typedRef, onRepo, onBranchPick, onTypedRef }: ScanNewPrivateProps) {
  const { data: installs } = useSuspenseQuery(githubInstallationsQuery());
  const { data: repos } = useSuspenseQuery(githubReposQuery());

  if (!installs.some((install) => install.status === "active")) {
    return (
      <Alert variant="info">
        <AlertDescription>
          <span className="block font-medium">{SCAN_PRIVATE_NONE_TITLE}</span>
          {SCAN_PRIVATE_NONE_BODY}{" "}
          <Link to="/connections" className="font-medium underline underline-offset-2">
            Open Connections
          </Link>
        </AlertDescription>
      </Alert>
    );
  }
  if (repos.length === 0) {
    return (
      <Alert variant="info">
        <AlertDescription>{SCAN_PRIVATE_EMPTY}</AlertDescription>
      </Alert>
    );
  }

  const items = [{ value: NONE, label: "Choose a repository…" }, ...repos.map((candidate) => ({ value: candidate.url, label: candidate.fullName }))];

  return (
    <div className="grid gap-2">
      <Label htmlFor="private-repo-pick">Which private repository should we audit?</Label>
      <Select
        value={repo?.url ?? NONE}
        items={items}
        onValueChange={(next) => {
          const picked = repos.find((candidate) => candidate.url === next);
          if (picked) onRepo(picked);
        }}
      >
        <SelectTrigger id="private-repo-pick">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {repos.map((candidate) => (
            <SelectItem key={`${candidate.installationId}/${candidate.fullName}`} value={candidate.url}>
              <span className="flex items-center gap-2">
                {candidate.fullName}
                {candidate.private && <Lock aria-label="Private" className="size-3 text-muted-foreground" />}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{SCAN_PRIVATE_REPO_HINT}</p>
      {repo !== undefined && <ScanNewPrivateBranches repo={repo} branchPick={branchPick} typedRef={typedRef} onBranchPick={onBranchPick} onTypedRef={onTypedRef} />}
    </div>
  );
}

export function ScanNewPrivate(props: ScanNewPrivateProps) {
  return (
    <Suspense fallback={<Skeleton className="h-24 w-full" />}>
      <ScanNewPrivateView {...props} />
    </Suspense>
  );
}
