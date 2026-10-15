import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

function FaqNavRowSkeleton({ width }: { width: string }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md px-2 py-2">
      <Skeleton className={`h-4 ${width}`} />
      <Skeleton className="h-3 w-4" />
    </li>
  );
}

function FaqRowSkeleton() {
  return (
    <li className="space-y-2 p-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-56" />
        <div className="flex shrink-0 gap-1">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </li>
  );
}

export function FaqPanelSkeleton() {
  return (
    <div className="grid items-start gap-8 lg:gap-x-16 lg:grid-cols-[2fr_3fr]">
      <PageCard title="Categories" description="Open one category at a time." contentClassName="p-0">
        <ul className="p-3">
          <FaqNavRowSkeleton width="w-20" />
          <FaqNavRowSkeleton width="w-28" />
          <FaqNavRowSkeleton width="w-24" />
          <FaqNavRowSkeleton width="w-32" />
        </ul>
        <div className="flex flex-wrap items-center gap-2 border-t p-6">
          <Skeleton className="h-10 min-w-0 flex-1" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </PageCard>
      <PageCard title="General" description="FAQs" contentClassName="p-0">
        <ul className="divide-y">
          <FaqRowSkeleton />
          <FaqRowSkeleton />
          <FaqRowSkeleton />
        </ul>
        <div className="border-t p-6">
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </PageCard>
    </div>
  );
}
