import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

const WEEKDAY_COUNT = 7;

function WeekdayRowSkeleton() {
  return (
    <li className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="size-8 rounded-md" />
    </li>
  );
}

function SpecialDateRowSkeleton() {
  return (
    <li className="flex items-center justify-between gap-4 px-6 py-5">
      <div className="min-w-0 space-y-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="size-8 rounded-md" />
    </li>
  );
}

export function SchedulePanelSkeleton() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <PageCard title="Add a special date" description="A holiday or other day with different hours.">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="size-4 rounded-sm" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="mt-3 h-9 w-36 rounded-md" />
        </div>
      </PageCard>
      <div className="space-y-8">
        <PageCard title="Weekly hours" description="Times are in the location timezone.">
          <ul>
            {Array.from({ length: WEEKDAY_COUNT }, (_, index) => (
              <WeekdayRowSkeleton key={index} />
            ))}
          </ul>
        </PageCard>
        <PageCard title="Special dates" description="Holidays and other days with different hours." contentClassName="p-0">
          <ul className="divide-y">
            <SpecialDateRowSkeleton />
            <SpecialDateRowSkeleton />
          </ul>
        </PageCard>
      </div>
    </div>
  );
}
