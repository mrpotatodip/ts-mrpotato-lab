import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

// -----
// Same two columns as the review: publish card on the
// left, the drafts on the right.
// -----
export function MenuImportReviewSkeleton() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <PageCard title="Publish">
        <Skeleton className="h-48 w-full" />
      </PageCard>
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}
