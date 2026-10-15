import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

function MenuImportDraftRowSkeleton() {
  return (
    <li className="flex flex-col gap-2 px-6 py-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-48" />
        <div className="flex shrink-0 gap-1">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-5 w-24 rounded-full" />
    </li>
  );
}

function DraftKindCardSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <PageCard title={title} description={description} contentClassName="p-0">
      <ul className="divide-y">
        <MenuImportDraftRowSkeleton />
        <MenuImportDraftRowSkeleton />
        <MenuImportDraftRowSkeleton />
      </ul>
    </PageCard>
  );
}

export function MenuImportReviewSkeleton() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <PageCard title="Publish">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </PageCard>
      <div className="flex flex-col gap-8">
        <DraftKindCardSkeleton title="Menu categories" description="Drafts" />
        <DraftKindCardSkeleton title="Menu items" description="Drafts" />
      </div>
    </div>
  );
}
