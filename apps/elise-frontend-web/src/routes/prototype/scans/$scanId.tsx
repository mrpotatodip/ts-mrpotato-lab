import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ScanDetail } from "#/modules/scan";

export const Route = createFileRoute("/prototype/scans/$scanId")({
  head: () => ({ meta: [{ title: "Demo scan report · Elise" }] }),
  component: PrototypeScan,
});

function PrototypeScan() {
  const { scanId } = Route.useParams();
  return (
    <>
      <Link to="/prototype/scans" data-slot="page-header" className="-mb-4 inline-flex min-h-6 w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeft className="size-3.5" />
        All scans
      </Link>
      <ScanDetail scanId={scanId} />
    </>
  );
}
