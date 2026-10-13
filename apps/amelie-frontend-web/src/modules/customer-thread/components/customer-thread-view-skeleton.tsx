import { Skeleton } from "#/components/ui/skeleton";
import { CustomerThreadMessagesSkeleton } from "./customer-thread-messages-skeleton";

// -----
// A heading, a date line, then message bubbles
// on alternating sides.
// -----
export function CustomerThreadViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-40" />
      </div>
      <CustomerThreadMessagesSkeleton />
    </div>
  );
}
