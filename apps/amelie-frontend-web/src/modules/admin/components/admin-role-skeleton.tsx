import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

export function AdminRoleSkeleton() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <div className="flex flex-col gap-8">
        <PageCard title="Details">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-9 w-24" />
          </div>
        </PageCard>
        <PageCard title="Status">
          <Skeleton className="h-16 w-full" />
        </PageCard>
      </div>
      <PageCard title="Powers">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </PageCard>
    </div>
  );
}
