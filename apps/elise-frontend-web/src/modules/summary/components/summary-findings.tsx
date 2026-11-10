import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "#/components/ui/collapsible";
import { range, SkeletonBar } from "#/components/ui/skeleton";
import { repoFindingsQuery, type Repo, type RepoFinding } from "#/modules/repo";
import { ScanSeverityBadge } from "#/modules/scan";
import { findingStateLabel, openFindings } from "../utils";

const STATE_VARIANT = { regressed: "destructive", needs_validation: "warning", confirmed: "outline" } as const;

const stateVariant = (finding: Pick<RepoFinding, "state" | "status">) => (finding.state === "regressed" ? STATE_VARIANT.regressed : STATE_VARIANT[finding.status]);

function Fact({ label, children }: { label: string; children: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="max-w-copy text-sm leading-relaxed">{children}</dd>
    </div>
  );
}

function SummaryFinding({ finding }: { finding: RepoFinding }) {
  const needs = finding.status === "needs_validation" ? finding.needs : null;
  const hasDetails = Boolean(finding.impact || finding.fix || needs);

  return (
    <li className="grid gap-3 py-4 pl-12 pr-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <ScanSeverityBadge severity={finding.severity} />
        <Badge variant={stateVariant(finding)}>{findingStateLabel(finding)}</Badge>
      </div>
      <h3 className="max-w-copy text-sm font-medium leading-relaxed">{finding.title}</h3>
      {hasDetails && (
        <Collapsible>
          <CollapsibleTrigger className="group inline-flex min-h-6 items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronDown aria-hidden="true" className="size-3.5 -rotate-90 transition-transform group-data-[panel-open]:rotate-0" />
            Details
          </CollapsibleTrigger>
          <CollapsiblePanel>
            <dl className="grid gap-3 pt-3">
              {finding.impact && <Fact label="What could happen">{finding.impact}</Fact>}
              {finding.fix && <Fact label="How it gets fixed">{finding.fix}</Fact>}
              {needs && <Fact label="What a person needs to check">{needs}</Fact>}
            </dl>
          </CollapsiblePanel>
        </Collapsible>
      )}
    </li>
  );
}

function FindingsPending() {
  return (
    <div className="grid gap-3 border-t py-4 pl-12 pr-5" aria-busy="true">
      {range(2).map((row) => (
        <SkeletonBar key={row} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function SummaryFindings({ repo }: { repo: Repo }) {
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(repoFindingsQuery(repo.id, { branch: repo.defaultBranch ?? undefined, triage: "open" }));

  if (isPending) return <FindingsPending />;

  if (isError)
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-t py-4 pl-12 pr-5">
        <p className="text-sm text-status-danger">We could not load the findings for this repository.</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );

  const findings = openFindings(data.pages.flatMap((page) => page.findings));

  return (
    <div className="border-t">
      {findings.length === 0 ? (
        <p className="py-4 pl-12 pr-5 text-sm text-muted-foreground">Nothing is open.</p>
      ) : (
        <ul className="divide-y divide-border/70">
          {findings.map((finding) => (
            <SummaryFinding key={finding.id} finding={finding} />
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
    </div>
  );
}
