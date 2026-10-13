import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

// -----
// Same two columns as the menu page: the organize
// card on the left, the category cards on the right.
// -----
export function MenuPanelSkeleton() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <div className="space-y-8">
        <PageCard title="Add a category" description="A section of the menu, like Coffee or Pastries.">
          <Skeleton className="h-24 w-full" />
        </PageCard>
        <PageCard title="Organize" contentClassName="p-3">
          <Skeleton className="h-48 w-full" />
        </PageCard>
      </div>
      <div className="space-y-6">
        <Skeleton className="h-56 w-full rounded-3xl" />
        <Skeleton className="h-56 w-full rounded-3xl" />
      </div>
    </div>
  );
}
