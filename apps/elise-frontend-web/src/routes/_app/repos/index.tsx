import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RepoList, RepoListSkeleton, reposQuery } from "#/modules/repo";
import { ShellPageHeader } from "#/modules/shell";

export const Route = createFileRoute("/_app/repos/")({
  head: () => ({ meta: [{ title: "Repositories · Elise" }] }),
  loader: ({ context }) => context.queryClient.query({ ...reposQuery(), staleTime: "static" }),
  component: ReposPage,
});

function ReposPage() {
  return (
    <>
      <ShellPageHeader title="Repositories" description="What is still open in each repository you scan, and what changed since the last scan. The ones that need attention come first." />
      <Suspense fallback={<RepoListSkeleton />}>
        <RepoList />
      </Suspense>
    </>
  );
}
