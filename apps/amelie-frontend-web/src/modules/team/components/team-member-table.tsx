import { useState } from "react";
import type { TeamMember, TeamRole } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { useTeamActions } from "../hooks";
import { TeamRoleSelect } from "./team-role-select";

type TeamMemberTableProps = {
  members: TeamMember[];
  roles: TeamRole[];
  canManageTeam: boolean;
};

// -----
// One row per person. Role and remove sit on
// the right, same as FAQ rows.
// -----
export function TeamMemberTable({ members, roles, canManageTeam }: TeamMemberTableProps) {
  const { changeRole, remove } = useTeamActions();
  const [pending, setPending] = useState<TeamMember | null>(null);

  if (members.length === 0) {
    return <p className="stat-label p-6">No team members yet.</p>;
  }

  return (
    <>
      <ul className="divide-y">
        {members.map((member) => (
          <li
            key={member.partyId}
            className="hover:bg-accent/40 flex flex-wrap items-center justify-between gap-3 px-6 py-5 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{member.name}</p>
              <p className="stat-label break-all">{member.email}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {canManageTeam ? (
                <TeamRoleSelect
                  aria-label={`Role for ${member.name}`}
                  roles={roles}
                  value={member.role}
                  valueLabel={member.roleLabel}
                  disabled={changeRole.isPending || !roles.some((role) => role.key === member.role)}
                  onChange={(role) => changeRole.mutate({ data: { partyId: member.partyId, role } })}
                />
              ) : (
                <p className="text-sm">{member.roleLabel}</p>
              )}
              {canManageTeam ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setPending(member)}>
                  Remove
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this team member?</DialogTitle>
            <DialogDescription>
              {pending ? `${pending.name} (${pending.email}) loses access to this cafe. Their login stays.` : null}
            </DialogDescription>
          </DialogHeader>
          {remove.error ? <p className="text-xs text-destructive">{remove.error.message}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending || !pending}
              onClick={() => {
                if (!pending) return;
                remove.mutate({ data: { partyId: pending.partyId } }, { onSuccess: () => setPending(null) });
              }}
            >
              {remove.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
