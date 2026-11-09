import type { ScanStatus } from "../schemas";

// -----
// Which branch and commit a scan read, so the many scans of one repository can
// be told apart without opening them. Branch names share long prefixes
// (feat/..., fix/...), so this shows the last part, as the sidebar does, and
// the whole name on hover. A scan of a pasted commit has no branch: it is a
// one-off scan, as on the branch page.
// -----
export function ScanOrigin({ scan }: { scan: Pick<ScanStatus, "branch" | "commitSha"> }) {
  const commit = scan.commitSha ? scan.commitSha.slice(0, 7) : null;
  if (!scan.branch && !commit) return null;

  return (
    <span className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      {scan.branch ? (
        <span className="min-w-0 truncate font-mono" title={scan.branch}>
          {scan.branch.split("/").at(-1) || scan.branch}
        </span>
      ) : (
        <span title="A one-off scan of this commit. Its findings count toward the commit's answer but are not added to a branch's findings.">one-off scan</span>
      )}
      {commit && <span className="shrink-0 font-mono">{commit}</span>}
    </span>
  );
}
