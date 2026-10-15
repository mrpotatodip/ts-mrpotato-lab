import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

function UnansweredQuestionRowSkeleton() {
  return (
    <li className="flex items-start justify-between gap-4 px-6 py-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="h-9 w-20" />
    </li>
  );
}

// -----
// The summary line, then rows shaped like questions.
// -----
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
