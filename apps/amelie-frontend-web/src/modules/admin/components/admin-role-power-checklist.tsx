import { useState } from "react";
import type { AdminRoleDetail } from "@repo/contracts/amelie";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Label } from "#/components/ui/label";
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
  isAdminPowerChecked,
  toAdminPowerGroups,
  withAdminPowerEdit,
  withAdminPowersEdit,
} from "../utils";
import type { AdminPowerEdits, AdminPowerGroup, AdminRolePowerSave } from "../types";

type AdminRolePowerChecklistProps = {
  role: AdminRoleDetail;
  saving: AdminRolePowerSave;
};

type PowerGroupProps = {
  group: AdminPowerGroup;
  saved: readonly string[];
  edits: AdminPowerEdits;
  locked: ReadonlySet<string>;
  disabled: boolean;
  onChange: (edits: AdminPowerEdits) => void;
};

function actionLabel(action: string): string {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

function PowerGroup({ group, saved, edits, locked, disabled, onChange }: PowerGroupProps) {
  const powers = allAdminPowers([group]);
  const changeable = powers.filter((power) => !locked.has(power));
  const checkedCount = changeable.filter((power) => isAdminPowerChecked(saved, edits, power)).length;
  const allChecked = changeable.length > 0 && checkedCount === changeable.length;
  const someChecked = checkedCount > 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{group.label}</h3>
        <Label htmlFor={`admin-role-all-${group.key}`} className="flex items-center gap-2 text-sm font-normal">
          <Checkbox
            id={`admin-role-all-${group.key}`}
            checked={allChecked}
            indeterminate={someChecked && !allChecked}
            disabled={disabled || changeable.length === 0}
            aria-label={`Select all ${group.label}`}
            onCheckedChange={(checked) => onChange(withAdminPowersEdit(saved, edits, changeable, checked))}
          />
          Select all
        </Label>
      </div>
      <ul className="divide-y rounded-2xl border">
        {group.sections.map((section) => (
          <li key={section.path} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
            <span className="text-sm">{section.label}</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {section.options.map((option) => {
                const isLocked = locked.has(option.power);
                return (
                  <label key={option.power} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={isAdminPowerChecked(saved, edits, option.power)}
                      disabled={disabled || isLocked}
                      aria-label={`${section.label}: ${option.action}`}
                      onCheckedChange={(checked) => onChange(withAdminPowerEdit(saved, edits, option.power, checked))}
                    />
                    {actionLabel(option.action)}
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

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
        <PowerGroup
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
