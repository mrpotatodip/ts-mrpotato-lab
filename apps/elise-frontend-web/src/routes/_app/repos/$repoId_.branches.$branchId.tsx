import { Suspense } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
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
    return { name: repoName(repo.url), branch: branch.name };
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData ? `${loaderData.name} · ${loaderData.branch}` : "Branch"} · Elise` }] }),
  component: BranchPage,
});

function BranchPage() {
  const { repoId, branchId } = Route.useParams();
  return (
    <>
      <Link to="/repos" className="-mb-4 inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeft className="size-3.5" />
        All repositories
      </Link>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <RepoDetail repoId={repoId} branchId={branchId} />
      </Suspense>
    </>
  );
}
