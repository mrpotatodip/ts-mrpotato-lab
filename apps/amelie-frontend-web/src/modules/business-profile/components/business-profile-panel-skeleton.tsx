import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

// -----
// Same two columns as the profile page: the details
// form on the left, region and locations on the right.
// -----
export function BusinessProfilePanelSkeleton() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <PageCard title="Cafe details" description="Shown to customers by the assistant.">
        <Skeleton className="h-80 w-full" />
      </PageCard>
      <div className="flex flex-col gap-8">
        <PageCard title="Region">
          <Skeleton className="h-24 w-full" />
        </PageCard>
        <PageCard title="Locations">
          <Skeleton className="h-24 w-full" />
        </PageCard>
      </div>
    </div>
  );
}
