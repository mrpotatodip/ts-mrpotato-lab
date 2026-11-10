import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Skeleton } from "#/components/ui/skeleton";
import { RepoAttentionList, RepoSummaryStrip, reposQuery } from "#/modules/repo";
import { overviewQuery, ScanOverview, scansQuery } from "#/modules/scan";
import { usageQuery } from "#/modules/usage";

export const Route = createFileRoute("/_app/overview")({
  head: () => ({ meta: [{ title: "Overview · EliseLAB" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query({ ...overviewQuery(), staleTime: "static" }),
      context.queryClient.query({ ...scansQuery(), staleTime: "static" }),
      context.queryClient.query({ ...usageQuery(), staleTime: "static" }),
      context.queryClient.query({ ...reposQuery(), staleTime: "static" }),
    ]),
  component: OverviewPage,
});

function OverviewWithRepos() {
  const { data } = useSuspenseQuery(reposQuery());
  return <ScanOverview decide={<RepoSummaryStrip repos={data.repos} />} attention={<RepoAttentionList repos={data.repos} />} />;
}

function OverviewPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <OverviewWithRepos />
    </Suspense>
  );
}
