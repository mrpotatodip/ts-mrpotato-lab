import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

function MenuImportDraftRowSkeleton() {
  return (
    <li className="flex flex-col gap-2 px-6 py-5">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-64" />
    </li>
  );
}

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
      <PageCard title="Menu items" description="Drafts" contentClassName="p-0">
        <ul className="divide-y">
          <MenuImportDraftRowSkeleton />
          <MenuImportDraftRowSkeleton />
          <MenuImportDraftRowSkeleton />
        </ul>
      </PageCard>
    </div>
  );
}
