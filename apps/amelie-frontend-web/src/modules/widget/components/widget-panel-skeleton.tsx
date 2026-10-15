import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

export function WidgetPanelSkeleton() {
  return (
    <div className="space-y-8">
      <PageCard
        title="Install on your website"
        description="Paste this on the cafe site. Only websites in Allowed origins can iframe the chat."
        action={<Skeleton className="h-9 w-20 rounded-md" />}
      >
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="mt-4 h-4 w-44" />
        <div className="mt-6 space-y-3 border-t pt-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-10/12" />
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
        </div>
      </PageCard>
      <PageCard
        title="Customer chat look"
        description="Bubble colour on the cafe site. The name is the accessible label, not title text."
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-16" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-10 w-14 rounded-md" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <Skeleton className="mt-3 h-9 w-16 rounded-md" />
        </div>
      </PageCard>
      <PageCard
        title="Allowed origins"
        description="Websites that may iframe the Customer chat. Paste a page URL; Amelie keeps the origin."
      >
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 min-w-0 flex-1" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-16 rounded-md" />
        </div>
      </PageCard>
    </div>
  );
}
