import { Checkbox } from "#/components/ui/checkbox";
import { Label } from "#/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import type { AdminPowerEdits, AdminPowerGroup } from "../types";
import {
  adminPowerGroupActions,
  adminPowerGroupAreas,
  allAdminPowers,
  isAdminPowerChecked,
  withAdminPowerEdit,
  withAdminPowersEdit,
} from "../utils";
import { AdminPowerUsage } from "./admin-power-usage";

type AdminRolePowerGroupProps = {
  group: AdminPowerGroup;
  saved: readonly string[];
  edits: AdminPowerEdits;
  locked: ReadonlySet<string>;
  disabled: boolean;
  onChange: (edits: AdminPowerEdits) => void;
};

const LABEL_COLUMN_MIN_PX = 190;
const ACTION_COLUMN_PX = 60;
const EDGE_COLUMN_PX = 16;

function actionLabel(action: string): string {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

// -----
// One group of the checklist as a grid: a column per Action,
// the areas down the side, so every box sits under its Action
// and a role's reach reads at a glance. On a narrow screen the
// grid scrolls inside its card.
// -----
export function AdminRolePowerGroup({ group, saved, edits, locked, disabled, onChange }: AdminRolePowerGroupProps) {
  const powers = allAdminPowers([group]);
  const changeable = powers.filter((power) => !locked.has(power));
  const checkedCount = changeable.filter((power) => isAdminPowerChecked(saved, edits, power)).length;
  const allChecked = changeable.length > 0 && checkedCount === changeable.length;
  const someChecked = checkedCount > 0;
  const actions = adminPowerGroupActions(group);
  const areas = adminPowerGroupAreas(group);

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
      <div className="overflow-hidden rounded-2xl border">
        <Table style={{ minWidth: `${LABEL_COLUMN_MIN_PX + actions.length * ACTION_COLUMN_PX + EDGE_COLUMN_PX}px` }}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 px-4 text-xs">
                <span className="sr-only">Area</span>
              </TableHead>
              {actions.map((action) => (
                <TableHead key={action} className="h-10 w-[60px] px-0.5 text-center text-xs whitespace-nowrap">
                  {actionLabel(action)}
                </TableHead>
              ))}
              <TableHead className="w-4 p-0" aria-hidden />
            </TableRow>
          </TableHeader>
          <TableBody>
            {areas.map((area) => [
              area.name ? (
                <TableRow key={`area-${area.name}`} className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={actions.length + 2} className="text-muted-foreground px-4 py-2 text-xs font-medium">
                    {area.name}
                  </TableCell>
                </TableRow>
              ) : null,
              ...area.rows.map(({ section, label }) => (
                <TableRow key={section.path}>
                  <TableCell className="py-2.5 pr-2 pl-4 text-sm">
                    <span className="flex items-center gap-3">
                      {label}
                      <AdminPowerUsage label={section.label} options={section.options} />
                    </span>
                  </TableCell>
                  {actions.map((action) => {
                    const option = section.options.find((candidate) => candidate.action === action);
                    return (
                      <TableCell key={action} className="px-0.5 py-2.5 text-center pr-0.5!">
                        {option ? (
                          <Tooltip>
                            <TooltipTrigger render={<span className="inline-flex" />}>
                              <Checkbox
                                checked={isAdminPowerChecked(saved, edits, option.power)}
                                disabled={disabled || locked.has(option.power)}
                                aria-label={`${section.label}: ${option.action}`}
                                onCheckedChange={(checked) => onChange(withAdminPowerEdit(saved, edits, option.power, checked))}
                              />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              {label}: {actionLabel(action)}
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </TableCell>
                    );
                  })}
                  <TableCell className="w-4 p-0" aria-hidden />
                </TableRow>
              )),
            ])}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
