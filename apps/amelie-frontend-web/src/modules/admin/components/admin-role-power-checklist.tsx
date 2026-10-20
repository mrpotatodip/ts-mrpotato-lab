import { useState } from "react";
import type { AdminRoleDetail } from "@repo/contracts/amelie";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import {
  adminPowerChanges,
  allAdminPowers,
  applyAdminPowerEdits,
  formatAdminHolderCount,
  toAdminPowerGroups,
} from "../utils";
import type { AdminPowerEdits, AdminRolePowerSave } from "../types";
import { AdminRolePowerGroup } from "./admin-role-power-group";

type AdminRolePowerChecklistProps = {
  role: AdminRoleDetail;
  saving: AdminRolePowerSave;
};

// -----
// Tick the Powers the role grants. Edits sit beside the
// saved list, never over it, and Save asks first because
// the change reaches everyone who holds the role.
// -----
export function AdminRolePowerChecklist({ role, saving }: AdminRolePowerChecklistProps) {
  const [edits, setEdits] = useState<AdminPowerEdits>({});
  const [confirming, setConfirming] = useState(false);
  const groups = toAdminPowerGroups(role.scope);
  const total = allAdminPowers(groups).length;
  const locked: ReadonlySet<string> = new Set(role.isSystem ? role.powers : []);
  const next = applyAdminPowerEdits(role.powers, edits);
  const changes = adminPowerChanges(edits);
  const changeCount = changes.added.length + changes.removed.length;
  const people = formatAdminHolderCount(role.holderCount);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">
        {next.length} of {total} powers.
        {role.isSystem ? " This is a system role: powers can be added, never taken away." : ""}
      </p>
      {groups.map((group) => (
        <AdminRolePowerGroup
          key={group.key}
          group={group}
          saved={role.powers}
          edits={edits}
          locked={locked}
          disabled={saving.isPending}
          onChange={setEdits}
        />
      ))}
      {saving.errorMessage ? <p className="text-destructive text-xs">{saving.errorMessage}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={changeCount === 0 || saving.isPending} onClick={() => setConfirming(true)}>
          Save powers
        </Button>
        <Button type="button" variant="outline" disabled={changeCount === 0 || saving.isPending} onClick={() => setEdits({})}>
          Discard changes
        </Button>
        {changeCount > 0 ? <span className="text-muted-foreground text-sm">{changeCount} unsaved</span> : null}
      </div>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to everyone with this role?</DialogTitle>
            <DialogDescription>
              {role.holderCount === 0
                ? "Nobody holds this role yet."
                : `${people} across every cafe get this at once.`}{" "}
              {changes.added.length} added, {changes.removed.length} removed.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-48 overflow-auto font-mono text-xs">
            {changes.added.map((power) => (
              <li key={power}>+ {power}</li>
            ))}
            {changes.removed.map((power) => (
              <li key={power} className="text-destructive">
                - {power}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving.isPending}
              onClick={() =>
                saving.save(next, () => {
                  setEdits({});
                  setConfirming(false);
                })
              }
            >
              {saving.isPending ? "Saving..." : "Save powers"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
