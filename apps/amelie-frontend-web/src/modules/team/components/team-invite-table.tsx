import type { TeamInvite, TeamRole } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { LocalDateTime } from "#/modules/shared";
import { useTeamActions } from "../hooks";
import { TeamRoleSelect } from "./team-role-select";

type TeamInviteTableProps = {
  invites: TeamInvite[];
  roles: TeamRole[];
  canManageTeam: boolean;
};

export function TeamInviteTable({ invites, roles, canManageTeam }: TeamInviteTableProps) {
  const { changeInviteRole, revoke } = useTeamActions();

  if (invites.length === 0) {
    return <p className="stat-label p-6">No pending invites.</p>;
  }

  return (
    <ul className="divide-y">
      {invites.map((invite) => (
        <li
          key={invite.id}
          className="hover:bg-accent/40 flex flex-wrap items-center justify-between gap-3 px-6 py-5 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium break-all">{invite.email}</p>
            <p className="stat-label">
              Expires <LocalDateTime iso={invite.expiresAt} />
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canManageTeam ? (
              <TeamRoleSelect
                aria-label={`Role for ${invite.email}`}
                roles={roles}
                value={invite.role}
                valueLabel={invite.roleLabel}
                disabled={changeInviteRole.isPending || !roles.some((role) => role.key === invite.role)}
                onChange={(role) => changeInviteRole.mutate({ data: { inviteId: invite.id, role } })}
              />
            ) : (
              <p className="text-sm">{invite.roleLabel}</p>
            )}
            {canManageTeam ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate({ data: { inviteId: invite.id } })}
              >
                Revoke
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
