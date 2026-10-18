import { useState } from "react";
import type { Country, Location, TeamMember, TeamRole } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { PowerMark } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";
import { useTeamActions } from "../hooks";
import { TeamAccessBadge } from "./team-access-badge";
import { TeamMemberEditDialog } from "./team-member-edit-dialog";

type TeamMemberTableProps = {
  members: TeamMember[];
  roles: TeamRole[];
  countries: Country[];
  locations: Location[];
};

// -----
// One row per person: their Role, where it applies
// (Whole cafe or the names), then edit and remove on
// the right, same as FAQ rows.
// -----
export function TeamMemberTable({ members, roles, countries, locations }: TeamMemberTableProps) {
  const { remove } = useTeamActions();
  const { can } = useActiveTenantRole();
  const canChangeRole = can("company:team:members:update");
  const canRemove = can("company:team:members:delete");
  const [pending, setPending] = useState<TeamMember | null>(null);
  const [editing, setEditing] = useState<TeamMember | null>(null);

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
            <div className="flex min-w-0 flex-col gap-2">
              <div>
                <p className="text-sm font-medium">
                  {member.name} <span className="stat-label font-normal">{member.roleLabel}</span>
                </p>
                <p className="stat-label break-all">{member.email}</p>
              </div>
              <TeamAccessBadge member={member} countries={countries} locations={locations} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {canChangeRole ? (
                <>
                  <PowerMark power="company:team:members:update" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Edit access for ${member.name}`}
                    onClick={() => setEditing(member)}
                  >
                    Edit access
                  </Button>
                </>
              ) : null}
              {canRemove ? (
                <>
                  <PowerMark power="company:team:members:delete" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setPending(member)}>
                    Remove
                  </Button>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <TeamMemberEditDialog
        member={editing}
        roles={roles}
        countries={countries}
        locations={locations}
        onClose={() => setEditing(null)}
      />
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
