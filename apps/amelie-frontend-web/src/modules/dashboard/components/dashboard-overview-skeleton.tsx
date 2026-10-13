import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

function StatCardSkeleton() {
  return (
    <div className="dashboard-card flex flex-col gap-3 rounded-3xl p-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

// -----
// Same grid as the overview, so the page does not
// jump when the numbers arrive.
// -----
export function DashboardOverviewSkeleton() {
  return (
    <>
      <div className="dashboard-grid">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
        <div className="space-y-8">
          <PageCard title="Needs your attention" contentClassName="p-0">
            <Skeleton className="m-6 h-32" />
          </PageCard>
        </div>
        <div className="space-y-8">
          <PageCard title="Chats this week">
            <Skeleton className="h-56 w-full" />
          </PageCard>
          <PageCard title="Recent chats" contentClassName="p-0">
            <Skeleton className="m-6 h-40" />
          </PageCard>
        </div>
      </div>
    </>
  );
}
