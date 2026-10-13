import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

// -----
// Same two columns as the panel: the add form and
// categories on the left, the FAQ groups on the right.
// -----
export function FaqPanelSkeleton() {
  return (
    <div className="grid items-start gap-8 lg:gap-x-16 lg:grid-cols-[2fr_3fr]">
      <div className="space-y-8">
        <PageCard title="Add an FAQ">
          <Skeleton className="h-48 w-full" />
        </PageCard>
        <PageCard title="Categories">
          <Skeleton className="h-24 w-full" />
        </PageCard>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}
