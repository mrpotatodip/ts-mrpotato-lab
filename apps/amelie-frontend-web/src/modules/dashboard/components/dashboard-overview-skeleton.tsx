import { Skeleton } from "#/components/ui/skeleton";
import { DASHBOARD_ACTIVITY_DAYS, DASHBOARD_RECENT_LIMIT } from "../constants";
import { PageCard } from "#/modules/shared";

const STAT_HINT_WIDTHS = ["w-40", "w-48", "w-32", "w-24"] as const;
const CHART_BAR_HEIGHTS = ["h-16", "h-28", "h-20", "h-40", "h-24", "h-36", "h-12"] as const;

function StatCardSkeleton({ hintWidth }: { hintWidth: string }) {
  return (
    <div className="dashboard-card flex flex-col gap-3 rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-9 rounded-[calc(var(--radius)-2px)]" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className={`h-4 ${hintWidth}`} />
    </div>
  );
}

function AttentionRowSkeleton() {
  return (
    <li className="flex flex-col gap-1 px-6 py-5">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-3 w-40" />
    </li>
  );
}

function RecentThreadRowSkeleton() {
  return (
    <li className="flex items-center justify-between gap-3 px-6 py-5">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-36" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
    </li>
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <>
      <div className="dashboard-grid">
        {STAT_HINT_WIDTHS.map((hintWidth) => (
          <StatCardSkeleton key={hintWidth} hintWidth={hintWidth} />
        ))}
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
        <div className="space-y-8">
          <PageCard
            title="Needs your attention"
            description="Questions the assistant could not answer, and a menu waiting on you."
            contentClassName="p-0"
          >
            <ul className="divide-y">
              {Array.from({ length: DASHBOARD_RECENT_LIMIT }, (_, index) => (
                <AttentionRowSkeleton key={index} />
              ))}
            </ul>
          </PageCard>
        </div>
        <div className="space-y-8">
          <PageCard title="Chats this week" description={`Last ${DASHBOARD_ACTIVITY_DAYS} days`}>
            <div className="flex h-56 items-end gap-3 px-1">
              {CHART_BAR_HEIGHTS.map((height) => (
                <Skeleton key={height} className={`w-full rounded-md ${height}`} />
              ))}
            </div>
          </PageCard>
          <PageCard
            title="Recent chats"
            description="The latest conversations. Amber means the assistant had to say it didn't know."
            contentClassName="p-0"
          >
            <ul className="divide-y">
              {Array.from({ length: DASHBOARD_RECENT_LIMIT }, (_, index) => (
                <RecentThreadRowSkeleton key={index} />
              ))}
            </ul>
          </PageCard>
        </div>
      </div>
    </>
  );
}
