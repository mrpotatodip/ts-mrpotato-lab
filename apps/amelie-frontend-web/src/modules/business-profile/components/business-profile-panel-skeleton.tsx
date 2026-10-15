import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

function ProfileFieldSkeleton({ labelWidth, tall }: { labelWidth: string; tall?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className={`h-4 ${labelWidth}`} />
      <Skeleton className={tall ? "h-24 w-full" : "h-10 w-full"} />
    </div>
  );
}

function LocationRowSkeleton() {
  return (
    <li className="p-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-10 w-56" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 min-w-56 flex-1" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-9 w-16 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>
    </li>
  );
}

export function BusinessProfilePanelSkeleton() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <PageCard title="Cafe details" description="Shown to customers by the assistant.">
        <div className="flex flex-col gap-3">
          <ProfileFieldSkeleton labelWidth="w-24" tall />
          <ProfileFieldSkeleton labelWidth="w-16" />
          <ProfileFieldSkeleton labelWidth="w-14" />
          <ProfileFieldSkeleton labelWidth="w-12" />
          <ProfileFieldSkeleton labelWidth="w-16" tall />
          <Skeleton className="mt-3 h-9 w-16 rounded-md" />
        </div>
      </PageCard>
      <PageCard title="Locations" description="The name, address, phone and timezone of each place." contentClassName="p-0">
        <ul className="divide-y">
          <LocationRowSkeleton />
          <LocationRowSkeleton />
        </ul>
        <div className="border-t p-6">
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </PageCard>
    </div>
  );
}
