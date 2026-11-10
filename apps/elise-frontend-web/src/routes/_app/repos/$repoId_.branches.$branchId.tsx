import { Suspense } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Skeleton } from "#/components/ui/skeleton";
import { noop } from "@tanstack/react-query";
import { RepoDetail, repoFindingsQuery, repoName, repoQuery } from "#/modules/repo";
import { verdictQuery } from "#/modules/scan";

export const Route = createFileRoute("/_app/repos/$repoId_/branches/$branchId")({
  loader: async ({ context, params }) => {
    const repo = await context.queryClient.query({ ...repoQuery(params.repoId), staleTime: "static" });
    const branch = repo.branches.find((item) => item.id === params.branchId);
    if (!branch) throw redirect({ to: "/repos/$repoId", params: { repoId: params.repoId }, replace: true });
    await context.queryClient.infiniteQuery({ ...repoFindingsQuery(params.repoId, { branch: branch.name }), staleTime: "static" });
    if (branch.latestCommit) void context.queryClient.query(verdictQuery(params.repoId, branch.latestCommit)).catch(noop);
    const branches = repo.branches
      .map((item) => ({ id: item.id, name: item.name, isDefault: item.isDefault, latestScanAt: item.latestScanAt, status: repo.history.find((scan) => scan.scanId === item.latestScanId)?.status ?? null }))
      .toSorted((a, b) => Number(b.isDefault) - Number(a.isDefault) || (b.latestScanAt ?? "").localeCompare(a.latestScanAt ?? ""));
    return { name: repoName(repo.url), branch: branch.name, repoId: params.repoId, branchId: branch.id, branches };
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData ? `${loaderData.name} · ${loaderData.branch}` : "Branch"} · EliseLAB` }] }),
  component: BranchPage,
});

function BranchPage() {
  const { repoId, branchId } = Route.useParams();
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <RepoDetail repoId={repoId} branchId={branchId} />
    </Suspense>
  );
}
