import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

export function WidgetPanelSkeleton() {
  return (
    <div className="space-y-6">
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
      <PageCard title="Allowed origins" description="Websites that may iframe the Customer chat.">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="mt-4 h-9 w-40" />
      </PageCard>
    </div>
  );
}
