import { Suspense } from "react";

import { PageCard, PageHeader } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";
import { useSuspenseTeam, useSuspenseTeamRoles } from "../hooks";
import { TeamInviteForm } from "./team-invite-form";
import { TeamInviteTable } from "./team-invite-table";
import { TeamMemberTable } from "./team-member-table";
import { TeamPanelSkeleton } from "./team-panel-skeleton";

const TEAM_INTRO = "Who can sign in to this cafe, and the invites still waiting.";

export function TeamSuspensePanelMain() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Team" description={TEAM_INTRO} />
          <TeamPanelSkeleton />
        </>
      }
    >
      <TeamPanelView />
    </Suspense>
  );
}

function TeamPanelView() {
  const { data } = useSuspenseTeam();
  const { data: roles } = useSuspenseTeamRoles();
  const { canManageTeam } = useActiveTenantRole();

  return (
    <>
      <PageHeader title="Team" description={TEAM_INTRO} />
      <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
        <div className="flex flex-col gap-8">
          {canManageTeam ? (
            <PageCard title="Invite" description="Send a join link. Amelie does not email it.">
              <TeamInviteForm roles={roles} />
            </PageCard>
          ) : null}
          <PageCard title="Pending invites" contentClassName="p-0">
            <TeamInviteTable invites={data.invites} roles={roles} canManageTeam={canManageTeam} />
          </PageCard>
        </div>
        <PageCard title="Team members" contentClassName="p-0">
          <TeamMemberTable members={data.members} roles={roles} canManageTeam={canManageTeam} />
        </PageCard>
      </div>
    </>
  );
}
