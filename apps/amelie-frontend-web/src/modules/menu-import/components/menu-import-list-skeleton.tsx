import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

function MenuImportRowSkeleton() {
  return (
    <li className="flex items-center justify-between gap-4 px-6 py-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-5 w-24 rounded-full" />
    </li>
  );
}

// -----
// Rows the height of real uploads, so the list does
// not jump when they arrive.
// -----
export function MenuImportListSkeleton() {
  return (
    <PageCard title="Your uploads" description="Open one to review what was read from it." contentClassName="p-0">
      <ul className="divide-y">
        <MenuImportRowSkeleton />
        <MenuImportRowSkeleton />
        <MenuImportRowSkeleton />
      </ul>
    </PageCard>
  );
}
