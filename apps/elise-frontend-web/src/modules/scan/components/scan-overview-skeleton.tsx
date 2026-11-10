import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { SkeletonBar, SkeletonCard, SkeletonStatStrip } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";
import { ShellPageHeader } from "#/modules/shell";

function PanelCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("h-99", className)}>
      <CardHeader className="gap-1.5">
        <SkeletonBar className="h-5 w-28" />
        <SkeletonBar className="h-4 w-44" />
      </CardHeader>
      <CardContent>
        <SkeletonBar className="h-56 w-full" />
      </CardContent>
    </Card>
  );
}

// -----
// Shaped like ScanOverview: the header is static text so it renders for real,
// then the summary strip, the two list cards and the usage, ring and chart row.
// -----
export function ScanOverviewSkeleton() {
  return (
    <>
      <ShellPageHeader title="Overview" description="What needs a decision across your repositories, and how your scans are going." />
      <output className="contents" aria-label="Loading">
        <SkeletonStatStrip />
        <div className="grid gap-8 lg:grid-cols-2">
          <SkeletonCard className="h-94" rows={4} />
          <SkeletonCard className="h-94" rows={4} />
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <PanelCardSkeleton />
          <PanelCardSkeleton />
          <PanelCardSkeleton className="md:col-span-2" />
        </div>
      </output>
    </>
  );
}
