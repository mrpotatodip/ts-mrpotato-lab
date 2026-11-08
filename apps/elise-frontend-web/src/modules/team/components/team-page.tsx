import { Suspense } from "react";
import { Skeleton } from "#/components/ui/skeleton";
import { ShellPageHeader } from "#/modules/shell";
import { TeamGroupsCard } from "./team-groups-card";
import { TeamMembersCard } from "./team-members-card";

export function TeamPage({ email }: { email: string }) {
  return (
    <>
      <ShellPageHeader title="Team" description="Who can use this account, and how they are grouped." />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <TeamMembersCard email={email} />
        <TeamGroupsCard />
      </Suspense>
    </>
  );
}
