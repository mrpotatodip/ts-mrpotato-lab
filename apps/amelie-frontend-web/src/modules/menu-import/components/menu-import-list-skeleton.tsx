import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

// -----
// The uploads card, as tall as a few rows.
// -----
export function MenuImportListSkeleton() {
  return (
    <PageCard title="Your uploads" description="Open one to review what was read from it." contentClassName="p-0">
      <Skeleton className="m-6 h-24" />
    </PageCard>
  );
}
