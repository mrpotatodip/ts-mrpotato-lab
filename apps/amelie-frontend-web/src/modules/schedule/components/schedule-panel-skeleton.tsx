import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

// -----
// Same two columns as the hours page: the special date
// form on the left, weekly hours and special dates on
// the right.
// -----
export function SchedulePanelSkeleton() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <PageCard title="Add a special date" description="A holiday or other day with different hours.">
        <Skeleton className="h-40 w-full" />
      </PageCard>
      <div className="space-y-8">
        <PageCard title="Weekly hours">
          <Skeleton className="h-56 w-full" />
        </PageCard>
        <PageCard title="Special dates" contentClassName="p-0">
          <Skeleton className="m-6 h-20" />
        </PageCard>
      </div>
    </div>
  );
}
