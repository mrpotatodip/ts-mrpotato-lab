import { Suspense } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { repoFindingsQuery, repoName, reposQuery } from "#/modules/repo";
import { SummaryRepoPage, SummaryRepoSkeleton } from "#/modules/summary";

// -----
// One repository for the people who watch: every open finding on its
// default branch, written out in full, with an address a finding can be
// shared by. A repository this account does not hold is not found.
// -----
export const Route = createFileRoute("/_app/summary/$repoId")({
  loader: async ({ context, params }) => {
    const { repos } = await context.queryClient.query({ ...reposQuery(), staleTime: "static" });
    const repo = repos.find((candidate) => candidate.id === params.repoId);
    if (!repo) throw notFound();
    await context.queryClient.infiniteQuery({ ...repoFindingsQuery(repo.id, { branch: repo.defaultBranch ?? undefined, triage: "open" }), staleTime: "static" });
    return { name: repoName(repo.url) };
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.name ?? "Repository"} · Summary · EliseLAB` }] }),
  component: SummaryRepoRoute,
});

function SummaryRepoRoute() {
  const { repoId } = Route.useParams();
  return (
    <Suspense fallback={<SummaryRepoSkeleton />}>
      <SummaryRepoPage repoId={repoId} />
    </Suspense>
  );
}
