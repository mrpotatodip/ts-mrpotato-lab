import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "#/components/ui/skeleton";
import { ScanList, ScanNewForm, scansQuery } from "#/modules/scan";

export const Route = createFileRoute("/_app/scans/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(scansQuery()),
  component: ScansPage,
});

function ScansPage() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 p-6">
      <ScanNewForm />
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Scans</h2>
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <ScanList />
        </Suspense>
      </section>
    </div>
  );
}
