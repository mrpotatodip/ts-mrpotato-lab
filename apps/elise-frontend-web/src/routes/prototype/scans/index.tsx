import { createFileRoute } from "@tanstack/react-router";
import { ScanList } from "#/modules/scan";
import { ShellPageHeader } from "#/modules/shell";

export const Route = createFileRoute("/prototype/scans/")({
  head: () => ({ meta: [{ title: "Demo scans · Elise" }] }),
  component: PrototypeScans,
});

function PrototypeScans() {
  return (
    <>
      <ShellPageHeader title="Scans" description="Every audit you have run, newest first. Open one to read its report." />
      <ScanList />
    </>
  );
}
