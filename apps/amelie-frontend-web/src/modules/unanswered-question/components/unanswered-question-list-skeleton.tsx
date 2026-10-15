import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

function UnansweredQuestionRowSkeleton() {
  return (
    <li className="flex items-start justify-between gap-4 px-6 py-5">
      <div className="flex min-w-0 flex-col gap-2">
        <Skeleton className="h-4 w-72" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="size-8 rounded-md" />
      </div>
    </li>
  );
}

export function UnansweredQuestionListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-80" />
      <PageCard
        title="Need information"
        description="Newest first. Dismiss one once you have covered it."
        contentClassName="p-0"
      >
        <ul className="divide-y">
          <UnansweredQuestionRowSkeleton />
          <UnansweredQuestionRowSkeleton />
          <UnansweredQuestionRowSkeleton />
        </ul>
      </PageCard>
    </div>
  );
}
