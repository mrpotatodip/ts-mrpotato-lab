import { Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Skeleton } from "#/components/ui/skeleton";
import { ScanDetail, scanQuery } from "#/modules/scan";

export const Route = createFileRoute("/_app/scans/$scanId")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(scanQuery(params.scanId)),
  component: ScanPage,
});

function ScanPage() {
  const { scanId } = Route.useParams();
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 p-6">
      <Link to="/scans" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        All scans
      </Link>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ScanDetail scanId={scanId} />
      </Suspense>
    </div>
  );
}
