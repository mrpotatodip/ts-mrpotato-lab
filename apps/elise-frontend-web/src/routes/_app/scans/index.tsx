import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "#/components/ui/skeleton";
import { ShellPageHeader } from "#/modules/shell";
import { ScanList, scansQuery } from "#/modules/scan";

export const Route = createFileRoute("/_app/scans/")({
  head: () => ({ meta: [{ title: "Scans · Elise" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(scansQuery()),
  component: ScansPage,
});

function ScansPage() {
  return (
    <>
      <ShellPageHeader title="Scans" description="Every audit you have run, newest first. Open one to read its report." />
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <ScanList />
      </Suspense>
    </>
  );
}
