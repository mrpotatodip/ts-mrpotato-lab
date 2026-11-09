import { Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "#/components/ui/skeleton";
import { prefetchScanReport, ScanDetail, scanQuery, scanRepoName } from "#/modules/scan";

export const Route = createFileRoute("/_app/scans/$scanId")({
  loader: async ({ context, params }) => {
    const scan = await context.queryClient.query({ ...scanQuery(params.scanId), staleTime: "static" });
    prefetchScanReport(context.queryClient, scan);
    const { owner, name } = scanRepoName(scan.repo, scan.scanId);
    return { name: owner ? `${owner}/${name}` : name, repoId: scan.repoId, branch: scan.branch ?? undefined, branchId: scan.branchId ?? undefined, commit: scan.commitSha?.slice(0, 7) };
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.name ?? "Scan"} report · Elise` }] }),
  component: ScanPage,
});

function ScanPage() {
  const { scanId } = Route.useParams();
  return (
    <>
      <Link to="/scans" data-slot="page-header" className="-mb-4 inline-flex min-h-6 w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeft className="size-3.5" />
        All scans
      </Link>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ScanDetail scanId={scanId} />
      </Suspense>
    </>
  );
}
