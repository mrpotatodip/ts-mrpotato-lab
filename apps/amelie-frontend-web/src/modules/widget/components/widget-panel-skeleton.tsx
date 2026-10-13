import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

export function WidgetPanelSkeleton() {
  return (
    <PageCard title="Install on your website" description="Paste this on the cafe site.">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="mt-4 h-4 w-40" />
    </PageCard>
  );
}
