import { Skeleton } from "#/components/ui/skeleton";

export function AdminRoleAuditSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-6">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-3/4" />
    </div>
  );
}
