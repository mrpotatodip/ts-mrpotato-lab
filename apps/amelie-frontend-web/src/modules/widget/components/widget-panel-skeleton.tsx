import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

export function WidgetPanelSkeleton() {
  return (
    <div className="space-y-6">
      <PageCard title="Install on your website" description="Paste this on the cafe site.">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="mt-4 h-4 w-40" />
      </PageCard>
      <PageCard title="Allowed origins" description="Websites that may iframe the Customer chat.">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="mt-4 h-9 w-40" />
      </PageCard>
    </div>
  );
}
