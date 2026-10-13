import { Skeleton } from "#/components/ui/skeleton";

// -----
// Stands in for the invite code table while it loads.
// -----
export function AdminInviteCodesSkeleton() {
  return (
    <div className="space-y-3 p-6">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}
