import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { range, SkeletonBar } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";
import { repoFindingsQuery, type Repo, type RepoFinding } from "#/modules/repo";
import { ScanSeverityBadge } from "#/modules/scan";
import { SUMMARY_COPY } from "../constants";
import { findingAnchor, findingPath, findingStateLabel, findingWhere, openFindings } from "../utils";

const STATE_VARIANT = { regressed: "destructive", needs_validation: "warning", confirmed: "outline" } as const;

const stateVariant = (finding: Pick<RepoFinding, "state" | "status">) => (finding.state === "regressed" ? STATE_VARIANT.regressed : STATE_VARIANT[finding.status]);

function Fact({ label, children, className }: { label: string; children: string; className?: string }) {
  return (
    <div className={cn("grid content-start gap-1", className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="max-w-copy text-sm leading-relaxed">{children}</dd>
    </div>
  );
}

function CopyLink({ repoId, finding }: { repoId: string; finding: Pick<RepoFinding, "id" | "title"> }) {
  const copy = () => {
    navigator.clipboard.writeText(`${window.location.origin}${findingPath(repoId, finding.id)}`).then(
      () => toast.success(SUMMARY_COPY.linkCopied),
      () => toast.error(SUMMARY_COPY.linkFailed),
    );
  };

  return (
    <Button type="button" variant="ghost" size="sm" onClick={copy} aria-label={`Copy link to: ${finding.title}`} className="text-muted-foreground">
      <Link2 aria-hidden="true" />
      Copy link
    </Button>
  );
}

// -----
// A finding is written out in full, the same for everyone who opens its
// link: what it is, where it is, what could happen, how it gets fixed, and
// what a person must check when the agent could not confirm it. The id in
// the link scrolls here and marks it.
// -----
function SummaryFinding({ repoId, finding }: { repoId: string; finding: RepoFinding }) {
  const needs = finding.status === "needs_validation" ? finding.needs : null;
  const where = findingWhere(finding);

  return (
    <li id={findingAnchor(finding.id)} className="grid scroll-mt-20 gap-4 px-6 py-5 target:bg-accent/40 target:shadow-[inset_3px_0_0_0_var(--primary)]">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {finding.severity !== null && <ScanSeverityBadge severity={finding.severity} />}
          <Badge variant={stateVariant(finding)}>{findingStateLabel(finding)}</Badge>
        </div>
        <CopyLink repoId={repoId} finding={finding} />
      </div>
      <div className="grid gap-1.5">
        <h3 className="max-w-copy text-[15px] font-semibold leading-relaxed">{finding.title}</h3>
        {where && (
          <p className="font-mono text-xs text-muted-foreground">
            <span className="sr-only">{SUMMARY_COPY.whereLabel}: </span>
            {where}
          </p>
        )}
      </div>
      {(finding.impact || finding.fix || needs) && (
        <dl className="grid gap-x-12 gap-y-4 lg:grid-cols-2">
          {finding.impact && <Fact label={SUMMARY_COPY.impactLabel}>{finding.impact}</Fact>}
          {finding.fix && <Fact label={SUMMARY_COPY.fixLabel}>{finding.fix}</Fact>}
          {needs && (
            <Fact label={SUMMARY_COPY.needsLabel} className="lg:col-span-2">
              {needs}
            </Fact>
          )}
        </dl>
      )}
    </li>
  );
}

function FindingsPending() {
  return (
    <CardContent className="grid gap-3" aria-busy="true">
      {range(3).map((row) => (
        <SkeletonBar key={row} className="h-20 w-full" />
      ))}
    </CardContent>
  );
}

export function SummaryFindings({ repo }: { repo: Repo }) {
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(repoFindingsQuery(repo.id, { branch: repo.defaultBranch ?? undefined, triage: "open" }));
  const findings = data ? openFindings(data.pages.flatMap((page) => page.findings)) : [];

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id !== "" && findings.length > 0) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [findings.length]);

  return (
    <Card>
      <CardHeader className="gap-1.5">
        <CardTitle>{SUMMARY_COPY.findingsTitle}</CardTitle>
        <div className="grid gap-x-10 gap-y-2 text-sm leading-relaxed text-muted-foreground lg:grid-cols-3">
          <p className="max-w-copy">{SUMMARY_COPY.findingsNext}</p>
          <p className="max-w-copy">{SUMMARY_COPY.findingsPrivate}</p>
          <p className="max-w-copy">{SUMMARY_COPY.findingsLegend}</p>
        </div>
      </CardHeader>
      {isPending ? (
        <FindingsPending />
      ) : isError ? (
        <CardContent>
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-status-danger">{SUMMARY_COPY.loadFailed}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        </CardContent>
      ) : (
        <CardContent className="overflow-hidden p-0">
          {findings.length === 0 ? (
            <p className="px-6 py-5 text-sm text-muted-foreground">{SUMMARY_COPY.nothingOpen}</p>
          ) : (
            <ul className="divide-y border-t">
              {findings.map((finding) => (
                <SummaryFinding key={finding.id} repoId={repo.id} finding={finding} />
              ))}
            </ul>
          )}
          {hasNextPage && (
            <div className="flex justify-center border-t p-4">
              <Button variant="outline" size="sm" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
                {isFetchingNextPage ? "Loading" : "Show more findings"}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
