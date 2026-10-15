import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

function CustomerThreadRowSkeleton() {
  return (
    <li className="flex items-center justify-between gap-3 px-6 py-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-5 w-24 rounded-full" />
    </li>
  );
}

// -----
// Rows the height of real chats, so the list does
// not jump when they arrive.
// -----
export function CustomerThreadListSkeleton() {
  return (
    <PageCard
      title="Conversations"
      description="Newest first. Amber means the assistant had to say it didn't know."
      contentClassName="p-0"
    >
      <ul className="divide-y">
        <CustomerThreadRowSkeleton />
        <CustomerThreadRowSkeleton />
        <CustomerThreadRowSkeleton />
      </ul>
    </PageCard>
  );
}
