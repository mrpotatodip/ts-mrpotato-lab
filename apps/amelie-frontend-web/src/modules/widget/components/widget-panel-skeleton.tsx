import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

export function WidgetPanelSkeleton() {
  return (
    <PageCard
      title="Install on your website"
      description="Paste this on the cafe site. Only websites in Allowed origins can iframe the chat."
      action={<Skeleton className="h-9 w-20 rounded-md" />}
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="mt-4 h-4 w-44" />
    </PageCard>
  );
}
