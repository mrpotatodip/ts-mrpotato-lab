import { Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "#/components/ui/skeleton";
import { ScanDetail, scanQuery, scanRepoName } from "#/modules/scan";

export const Route = createFileRoute("/_app/scans/$scanId")({
  loader: async ({ context, params }) => {
    const scan = await context.queryClient.ensureQueryData(scanQuery(params.scanId));
    return { name: scanRepoName(scan.repo, scan.scanId).name };
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.name ?? "Scan"} report · Elise` }] }),
  component: ScanPage,
});

function ScanPage() {
  const { scanId } = Route.useParams();
  return (
    <>
      <Link to="/scans" className="-mb-4 inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeft className="size-3.5" />
        All scans
      </Link>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ScanDetail scanId={scanId} />
      </Suspense>
    </>
  );
}
