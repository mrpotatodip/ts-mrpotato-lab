import { Card } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";

function UnansweredQuestionRowSkeleton() {
  return (
    <li className="flex items-start justify-between gap-4 p-6">
      <div className="space-y-2">
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
    <div className="space-y-6">
      <Skeleton className="h-4 w-80" />
      <Card className="overflow-hidden">
        <ul className="divide-y">
          <UnansweredQuestionRowSkeleton />
          <UnansweredQuestionRowSkeleton />
          <UnansweredQuestionRowSkeleton />
        </ul>
      </Card>
    </div>
  );
}
