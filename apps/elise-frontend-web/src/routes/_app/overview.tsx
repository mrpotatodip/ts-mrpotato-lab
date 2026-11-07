import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "#/components/ui/skeleton";
import { overviewQuery, ScanOverview, scansQuery } from "#/modules/scan";

export const Route = createFileRoute("/_app/overview")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(overviewQuery()), context.queryClient.ensureQueryData(scansQuery())]),
  component: OverviewPage,
});

function OverviewPage() {
  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ScanOverview />
      </Suspense>
    </div>
  );
}
