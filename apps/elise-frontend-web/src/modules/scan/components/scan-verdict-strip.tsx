import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { buttonVariants } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";
import { verdictQuery } from "../hooks";
import { VERDICT_COPY, verdictNextSteps } from "./scan-verdict-card";

type ScanVerdictStripProps = { repoId: string; branchId: string; commit: string };

// -----
// The answer belongs to the commit, and the branch page is where it is read in
// full and acted on. A scan page shows only the answer and the next step, with
// one way across, so the scan's own findings stay the main thing on the page.
// A scan with no branch (a one-off scan) has no branch page: it shows the full
// card instead.
// -----
export function ScanVerdictStrip({ repoId, branchId, commit }: ScanVerdictStripProps) {
  const { data, isPending, error } = useQuery(verdictQuery(repoId, commit));

  if (isPending) return <Skeleton className="h-[4.5rem] w-full" />;
  if (error) return <p className="text-sm text-destructive">We could not load the answer for this commit: {error.message}. Refresh to try again.</p>;

  const copy = VERDICT_COPY[data.verdict];
  return (
    <Alert variant={copy.variant} className="items-center">
      <copy.Icon className="self-start" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="grid min-w-0 gap-1">
          <AlertDescription className="font-semibold">
            Ready to ship? {copy.title}
            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">commit {commit.slice(0, 7)}</span>
          </AlertDescription>
          <AlertDescription className="max-w-prose text-foreground">{verdictNextSteps(data)}</AlertDescription>
        </div>
        <Link to="/repos/$repoId/branches/$branchId" params={{ repoId, branchId }} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 text-foreground")}>
          See the full answer
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </Alert>
  );
}
