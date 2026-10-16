import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

function MemberRowSkeleton() {
  return (
    <li className="flex items-center justify-between gap-3 px-6 py-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-44" />
      </div>
      <Skeleton className="h-10 w-40 rounded-md" />
    </li>
  );
}

export function TeamPanelSkeleton() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <div className="flex flex-col gap-8">
        <PageCard title="Invite" description="Send a join link. Amelie does not email it.">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-10 w-40 rounded-md" />
            </div>
            <Skeleton className="mt-4 h-9 w-20 rounded-md" />
          </div>
        </PageCard>
        <PageCard title="Pending invites" contentClassName="p-0">
          <p className="stat-label p-6">No pending invites.</p>
        </PageCard>
      </div>
      <PageCard title="Team members" contentClassName="p-0">
        <ul className="divide-y">
          <MemberRowSkeleton />
          <MemberRowSkeleton />
          <MemberRowSkeleton />
        </ul>
      </PageCard>
    </div>
  );
}
