import { Suspense } from "react";
import { ShellPageHeader } from "#/modules/shell";
import { TeamGroupsCard } from "./team-groups-card";
import { TeamMembersCard } from "./team-members-card";
import { TeamPageSkeleton } from "./team-page-skeleton";

export function TeamPage({ email }: { email: string }) {
  return (
    <>
      <ShellPageHeader title="Team" description="Who can use this account, and how they are grouped." />
      <Suspense fallback={<TeamPageSkeleton />}>
        <TeamMembersCard email={email} />
        <TeamGroupsCard />
      </Suspense>
    </>
  );
}
