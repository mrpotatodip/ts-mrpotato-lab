import { ACCESS_CATALOGUE, type AccessNode } from "@repo/contracts/amelie";
import type { AdminPowerEdits, AdminPowerGroup, AdminPowerScope, AdminPowerSection } from "../types";

const PLATFORM_ROOT_KEY = "platform";

const collectSections = (node: AccessNode, parentKeys: string[], parentLabels: string[]): AdminPowerSection[] => {
  const keys = [...parentKeys, node.key];
  const labels = [...parentLabels, node.label];
  const own: AdminPowerSection[] =
    node.actions && node.actions.length > 0
      ? [
          {
            path: keys.join(":"),
            label: labels.slice(1).join(" › "),
            options: node.actions.map((action) => ({ power: `${keys.join(":")}:${action}`, action })),
          },
        ]
      : [];
  const nested = (node.children ?? []).flatMap((child) => collectSections(child, keys, labels));
  return [...own, ...nested];
};

// -----
// The catalogue as the checklist shows it: one group per
// top-level node, one section per leaf, one option per
// Action. A role only sees the Powers of its own scope.
// -----
export function toAdminPowerGroups(scope: AdminPowerScope): AdminPowerGroup[] {
  return ACCESS_CATALOGUE.filter((root) => (root.key === PLATFORM_ROOT_KEY) === (scope === "platform")).map(
    (root) => ({
      key: root.key,
      label: root.label,
      sections: (root.children ?? []).flatMap((child) => collectSections(child, [root.key], [root.label])),
    }),
  );
}

export function allAdminPowers(groups: readonly AdminPowerGroup[]): string[] {
  return groups.flatMap((group) => group.sections.flatMap((section) => section.options.map((option) => option.power)));
}

export function isAdminPowerChecked(saved: readonly string[], edits: AdminPowerEdits, power: string): boolean {
  return power in edits ? edits[power] : saved.includes(power);
}

// -----
// Edits hold only what differs from the saved list, so
// putting a box back leaves no trace and "unsaved" is
// simply "has an edit".
// -----
export function withAdminPowerEdit(
  saved: readonly string[],
  edits: AdminPowerEdits,
  power: string,
  checked: boolean,
): AdminPowerEdits {
  const { [power]: _removed, ...rest } = edits;
  return saved.includes(power) === checked ? rest : { ...rest, [power]: checked };
}

export function withAdminPowersEdit(
  saved: readonly string[],
  edits: AdminPowerEdits,
  powers: readonly string[],
  checked: boolean,
): AdminPowerEdits {
  return powers.reduce((next, power) => withAdminPowerEdit(saved, next, power, checked), edits);
}

export function applyAdminPowerEdits(saved: readonly string[], edits: AdminPowerEdits): string[] {
  const kept = saved.filter((power) => edits[power] !== false);
  const added = Object.entries(edits)
    .filter(([power, checked]) => checked && !saved.includes(power))
    .map(([power]) => power);
  return [...kept, ...added].toSorted();
}

export function adminPowerChanges(edits: AdminPowerEdits) {
  const entries = Object.entries(edits);
  return {
    added: entries.filter(([, checked]) => checked).map(([power]) => power).toSorted(),
    removed: entries.filter(([, checked]) => !checked).map(([power]) => power).toSorted(),
  };
}
