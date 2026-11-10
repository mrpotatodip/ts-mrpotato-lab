import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShellPageHeader } from "#/modules/shell";
import { ScanList, ScanListSkeleton, scansQuery } from "#/modules/scan";

export const Route = createFileRoute("/_app/scans/")({
  head: () => ({ meta: [{ title: "Scans · EliseLAB" }] }),
  loader: ({ context }) => context.queryClient.query({ ...scansQuery(), staleTime: "static" }),
  component: ScansPage,
});

function ScansPage() {
  return (
    <>
      <ShellPageHeader title="Scans" description="Every audit you have run, newest first. Open one to read its report." />
      <Suspense fallback={<ScanListSkeleton />}>
        <ScanList />
      </Suspense>
    </>
  );
}
