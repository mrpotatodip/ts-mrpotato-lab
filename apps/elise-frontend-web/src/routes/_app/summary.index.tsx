import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { reposQuery } from "#/modules/repo";
import { SummaryPage, SummarySkeleton } from "#/modules/summary";

export const Route = createFileRoute("/_app/summary/")({
  head: () => ({ meta: [{ title: "Summary · EliseLAB" }] }),
  loader: ({ context }) => context.queryClient.query({ ...reposQuery(), staleTime: "static" }),
  component: SummaryRoute,
});

function SummaryRoute() {
  return (
    <Suspense fallback={<SummarySkeleton />}>
      <SummaryPage />
    </Suspense>
  );
}
