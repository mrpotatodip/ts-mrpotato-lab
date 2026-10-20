import { ACCESS_ACTION_VALUES } from "@repo/contracts/amelie";
import type { AdminPowerArea, AdminPowerGroup } from "../types";

const LABEL_SEPARATOR = " › ";

// -----
// The Actions a group uses, in the catalogue's own order, so
// every row of its grid lines up under the same column.
// -----
export function adminPowerGroupActions(group: AdminPowerGroup): string[] {
  const used = new Set(group.sections.flatMap((section) => section.options.map((option) => option.action)));
  return ACCESS_ACTION_VALUES.filter((action) => used.has(action));
}

// -----
// A group's sections gathered under the area they share
// ("Master menu" over "Menu item", "Menu category"), so a row
// only needs its own short name.
// -----
export function adminPowerGroupAreas(group: AdminPowerGroup): AdminPowerArea[] {
  const areas: AdminPowerArea[] = [];
  for (const section of group.sections) {
    const parts = section.label.split(LABEL_SEPARATOR);
    const label = parts.at(-1) ?? section.label;
    const name = parts.slice(0, -1).join(LABEL_SEPARATOR);
    const last = areas.at(-1);
    if (last && last.name === name) last.rows.push({ section, label });
    else areas.push({ name, rows: [{ section, label }] });
  }
  return areas;
}
