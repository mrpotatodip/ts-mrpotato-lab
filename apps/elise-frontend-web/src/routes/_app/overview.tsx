import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "#/components/ui/skeleton";
import { overviewQuery, ScanOverview, scansQuery } from "#/modules/scan";
import { usageQuery } from "#/modules/usage";

export const Route = createFileRoute("/_app/overview")({
  head: () => ({ meta: [{ title: "Overview · Elise" }] }),
  loader: ({ context }) => Promise.all([context.queryClient.query({ ...overviewQuery(), staleTime: "static" }), context.queryClient.query({ ...scansQuery(), staleTime: "static" }), context.queryClient.query({ ...usageQuery(), staleTime: "static" })]),
  component: OverviewPage,
});

function OverviewPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ScanOverview />
    </Suspense>
  );
}
