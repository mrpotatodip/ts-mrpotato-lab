import { useState } from "react";
import type { Country, Location, TeamMember, TeamRole, UpdateTeamMemberBody } from "@repo/contracts/amelie";

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
import type { TeamAccess } from "../types";
import { accessFromBindings, bindingsFromAccess } from "../utils";
import { TeamBindingPicker } from "./team-binding-picker";
import { TeamRoleSelect } from "./team-role-select";

type TeamMemberEditDialogProps = {
  member: TeamMember | null;
  roles: TeamRole[];
  countries: Country[];
  locations: Location[];
  onClose: () => void;
};

export function TeamMemberEditDialog({ member, roles, countries, locations, onClose }: TeamMemberEditDialogProps) {
  return (
    <Dialog open={member !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {member ? (
          <TeamMemberEditForm
            key={member.partyId}
            member={member}
            roles={roles}
            countries={countries}
            locations={locations}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TeamMemberEditForm({
  member,
  roles,
  countries,
  locations,
  onClose,
}: Omit<TeamMemberEditDialogProps, "member"> & { member: TeamMember }) {
  const { saveMember } = useTeamActions();
  const [role, setRole] = useState(member.role);
  const [access, setAccess] = useState<TeamAccess>(
    member.canBeBound ? accessFromBindings(member.bindings) : null,
  );
  const picked = roles.find((candidate) => candidate.key === role);
  const canBeBound = picked?.canBeBound ?? member.canBeBound;
  const bindings = canBeBound ? bindingsFromAccess(access) : null;
  const ready = !canBeBound || bindings !== null;
  const save = () => {
    const data: UpdateTeamMemberBody & { partyId: string } = { partyId: member.partyId, role };
    if (bindings) data.bindings = bindings;
    saveMember.mutate({ data }, { onSuccess: onClose });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Access for {member.name}</DialogTitle>
        <DialogDescription>Role and where it applies.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="stat-label">Role</span>
          <TeamRoleSelect
            aria-label="Role"
            roles={roles}
            value={role}
            valueLabel={picked?.label ?? member.roleLabel}
            disabled={!roles.some((candidate) => candidate.key === member.role)}
            onChange={(next) => {
              const nextCanBeBound = roles.find((candidate) => candidate.key === next)?.canBeBound ?? false;
              setRole(next);
              if (nextCanBeBound && !canBeBound) setAccess(null);
            }}
          />
        </div>
        {canBeBound ? (
          <div className="flex flex-col gap-1.5">
            <span className="stat-label">Where</span>
            <TeamBindingPicker value={access} onChange={setAccess} countries={countries} locations={locations} />
          </div>
        ) : (
          <p className="stat-label">This Role is never limited, so any Locations are cleared when you save.</p>
        )}
      </div>
      {saveMember.error ? <p className="text-xs text-destructive">{saveMember.error.message}</p> : null}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!ready || saveMember.isPending}
          onClick={save}
        >
          {saveMember.isPending ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
