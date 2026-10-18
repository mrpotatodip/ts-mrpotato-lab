import type { Country, Location, TeamInvite, TeamRole } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { LocalDateTime, PowerMark } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";
import { useTeamActions } from "../hooks";
import { describeBindings } from "../utils";
import { TeamRoleSelect } from "./team-role-select";

type TeamInviteTableProps = {
  invites: TeamInvite[];
  roles: TeamRole[];
  countries: Country[];
  locations: Location[];
};

export function TeamInviteTable({ invites, roles, countries, locations }: TeamInviteTableProps) {
  const { changeInviteRole, revoke } = useTeamActions();
  const { can } = useActiveTenantRole();
  const canChangeRole = can("company:team:invites:update");
  const canRevoke = can("company:team:invites:delete");

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
            {invite.bindings.length > 0 ? (
              <p className="stat-label">{describeBindings(invite.bindings, countries, locations)}</p>
            ) : null}
            <p className="stat-label">
              Expires <LocalDateTime iso={invite.expiresAt} />
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canChangeRole ? (
              <>
                <PowerMark power="company:team:invites:update" />
                <TeamRoleSelect
                  aria-label={`Role for ${invite.email}`}
                  roles={roles}
                  value={invite.role}
                  valueLabel={invite.roleLabel}
                  disabled={changeInviteRole.isPending || !roles.some((role) => role.key === invite.role)}
                  onChange={(role) => changeInviteRole.mutate({ data: { inviteId: invite.id, role } })}
                />
              </>
            ) : (
              <p className="text-sm">{invite.roleLabel}</p>
            )}
            {canRevoke ? (
              <>
                <PowerMark power="company:team:invites:delete" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate({ data: { inviteId: invite.id } })}
                >
                  Revoke
                </Button>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
