import { Suspense } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { Skeleton } from "#/components/ui/skeleton";
import { RepoDetail, repoName, repoQuery } from "#/modules/repo";

const SearchSchema = z.object({ branch: z.string().min(1).optional() }).catch({});

// -----
// A repository has no page of its own: it opens its default branch, or the
// branch named in the link. A repository with no branch shows what to do next.
// -----
export const Route = createFileRoute("/_app/repos/$repoId")({
  validateSearch: SearchSchema,
  loaderDeps: ({ search }) => ({ branch: search.branch }),
  loader: async ({ context, params, deps }) => {
    const repo = await context.queryClient.query({ ...repoQuery(params.repoId), staleTime: "static" });
    const target = repo.branches.find((branch) => branch.name === deps.branch) ?? repo.branches.find((branch) => branch.isDefault) ?? repo.branches[0];
    if (target) throw redirect({ to: "/repos/$repoId/branches/$branchId", params: { repoId: params.repoId, branchId: target.id }, replace: true });
    return { name: repoName(repo.url) };
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.name ?? "Repository"} · Elise` }] }),
  component: RepoPage,
});

function RepoPage() {
  const { repoId } = Route.useParams();
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <RepoDetail repoId={repoId} />
    </Suspense>
  );
}
