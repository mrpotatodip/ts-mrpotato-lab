import { Skeleton } from "#/components/ui/skeleton";
import { CustomerThreadMessagesSkeleton } from "./customer-thread-messages-skeleton";

// -----
// A heading, a date line, then message bubbles
// on alternating sides.
// -----
export function CustomerThreadViewSkeleton() {
  return (
    <>
      <header className="mb-6 space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-6 w-48" />
      </header>
      <div className="mx-auto w-full max-w-2xl">
        <CustomerThreadMessagesSkeleton />
      </div>
    </>
  );
}
