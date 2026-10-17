import type { AccessActionValue } from "../enums";
import { ACCESS_CATALOGUE, type AccessNode } from "./catalogue";

export type AccessPowerDescription = {
  power: string;
  group: string;
  section: string;
  action: AccessActionValue;
  label: string;
};

const capitalise = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

const collect = (node: AccessNode, keys: string[], labels: string[]): AccessPowerDescription[] => {
  const nextKeys = [...keys, node.key];
  const nextLabels = [...labels, node.label];
  const own = (node.actions ?? []).map((action) => {
    const section = nextLabels.slice(1).join(" › ");
    return {
      power: `${nextKeys.join(":")}:${action}`,
      group: nextLabels[0],
      section,
      action,
      label: `${section} · ${capitalise(action)}`,
    };
  });
  const nested = (node.children ?? []).flatMap((child) => collect(child, nextKeys, nextLabels));
  return [...own, ...nested];
};

const DESCRIPTIONS: ReadonlyMap<string, AccessPowerDescription> = new Map(
  ACCESS_CATALOGUE.flatMap((root) => collect(root, [], [])).map((description) => [description.power, description]),
);

// -----
// A Power in words: the group it sits under, the screen
// area it guards, and the Action, for tooltips and lists.
// Null for a string that is not a catalogue leaf.
// -----
export const describeAccessPower = (power: string): AccessPowerDescription | null => DESCRIPTIONS.get(power) ?? null;
