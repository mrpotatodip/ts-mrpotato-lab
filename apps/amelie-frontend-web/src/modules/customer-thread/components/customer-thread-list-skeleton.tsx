import { Card } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";

function CustomerThreadRowSkeleton() {
  return (
    <li className="flex items-center justify-between gap-4 p-6">
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
    <Card className="overflow-hidden">
      <ul className="divide-y">
        <CustomerThreadRowSkeleton />
        <CustomerThreadRowSkeleton />
        <CustomerThreadRowSkeleton />
      </ul>
    </Card>
  );
}
