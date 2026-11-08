import { Suspense } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "#/components/ui/skeleton";
import { RepoDetail, repoFindingsQuery, repoName, repoQuery } from "#/modules/repo";

export const Route = createFileRoute("/_app/repos/$repoId_/branches/$branchId")({
  loader: async ({ context, params }) => {
    const repo = await context.queryClient.ensureQueryData(repoQuery(params.repoId));
    const branch = repo.branches.find((item) => item.id === params.branchId);
    if (!branch) throw redirect({ to: "/repos/$repoId", params: { repoId: params.repoId }, replace: true });
    await context.queryClient.ensureInfiniteQueryData(repoFindingsQuery(params.repoId, { branch: branch.name }));
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
