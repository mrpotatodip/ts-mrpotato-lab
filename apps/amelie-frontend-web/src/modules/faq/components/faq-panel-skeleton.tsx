import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

export function FaqPanelSkeleton() {
  return (
    <div className="grid items-start gap-8 lg:gap-x-16 lg:grid-cols-[2fr_3fr]">
      <PageCard title="Categories">
        <Skeleton className="h-40 w-full" />
      </PageCard>
      <PageCard title="General">
        <Skeleton className="h-64 w-full" />
      </PageCard>
    </div>
  );
}
