import type { AccessActionValue } from "../enums";

export type AccessNode = {
  key: string;
  label: string;
  actions?: readonly AccessActionValue[];
  children?: readonly AccessNode[];
};

// -----
// Dashboard access tree. A Power is the colon
// path to a leaf Action, any depth. The last
// segment is always an Action. Grants are those
// exact strings: no wildcards, no implied read,
// a parent path does not grant children.
// -----
export const ACCESS_CATALOGUE = [
  {
    key: "company",
    label: "Company",
    children: [
      {
        key: "profile",
        label: "Profile",
        children: [
          { key: "business_profile", label: "Business profile", actions: ["read", "update"] },
          { key: "countries", label: "Country", actions: ["read", "create", "update", "archive"] },
          { key: "locations", label: "Location", actions: ["read", "create", "update", "archive"] },
          { key: "region", label: "Region", actions: ["read", "update"] },
        ],
      },
      {
        key: "team",
        label: "Team",
        children: [
          { key: "members", label: "Member", actions: ["read", "update", "delete"] },
          { key: "invites", label: "Team invite", actions: ["read", "create", "update", "delete"] },
        ],
      },
      {
        key: "menu",
        label: "Master menu",
        children: [
          { key: "categories", label: "Menu category", actions: ["read", "create", "update", "delete", "reorder"] },
          { key: "items", label: "Menu item", actions: ["read", "create", "update", "delete", "reorder"] },
          { key: "country_prices", label: "Country price", actions: ["read", "update"] },
          { key: "images", label: "Menu item image", actions: ["read", "create", "update", "delete", "reorder"] },
          { key: "imports", label: "Import", actions: ["read", "create", "publish"] },
          { key: "import_drafts", label: "Import draft", actions: ["read", "update"] },
        ],
      },
      {
        key: "faqs",
        label: "FAQs",
        children: [
          { key: "faqs", label: "FAQ", actions: ["read", "create", "update", "delete"] },
          { key: "categories", label: "FAQ category", actions: ["read", "create", "update", "delete"] },
        ],
      },
      {
        key: "chats",
        label: "Chats",
        children: [{ key: "threads", label: "Customer thread", actions: ["read"] }],
      },
      {
        key: "unanswered",
        label: "Unanswered",
        children: [{ key: "questions", label: "Unanswered question", actions: ["read", "dismiss"] }],
      },
      {
        key: "assistant",
        label: "Assistant",
        children: [{ key: "threads", label: "Signed-in thread", actions: ["read", "create", "update", "delete"] }],
      },
    ],
  },
  {
    key: "store",
    label: "Store",
    children: [
      {
        key: "hours",
        label: "Hours",
        children: [
          { key: "weekly", label: "Business hours", actions: ["read", "update"] },
          { key: "overrides", label: "Hours override", actions: ["read", "create", "update", "delete"] },
        ],
      },
      {
        key: "menu",
        label: "Store menu",
        children: [{ key: "availability", label: "Location availability", actions: ["read", "update"] }],
      },
    ],
  },
  {
    key: "integration",
    label: "Integration",
    children: [
      {
        key: "widget",
        label: "Widget",
        children: [
          { key: "origins", label: "Allowed origins", actions: ["read", "update"] },
          { key: "look", label: "Customer chat look", actions: ["read", "update"] },
        ],
      },
    ],
  },
  {
    key: "platform",
    label: "Admin",
    children: [
      {
        key: "admin",
        label: "Invite codes",
        children: [{ key: "invite_codes", label: "Invite code", actions: ["read", "create", "delete"] }],
      },
    ],
  },
] as const satisfies readonly AccessNode[];

export type AccessCatalogue = typeof ACCESS_CATALOGUE;

const collectPowers = (node: AccessNode, prefix: string): string[] => {
  const path = prefix === "" ? node.key : `${prefix}:${node.key}`;
  const own = (node.actions ?? []).map((action) => `${path}:${action}`);
  const nested = (node.children ?? []).flatMap((child) => collectPowers(child, path));
  return [...own, ...nested];
};

export const ACCESS_POWERS = ACCESS_CATALOGUE.flatMap((node) => collectPowers(node, ""));

const ACCESS_POWER_SET = new Set(ACCESS_POWERS);

export const isAccessPower = (value: string): boolean => ACCESS_POWER_SET.has(value);

export const hasAccessPower = (grants: readonly string[], power: string): boolean => grants.includes(power);

const powerAction = (power: string): string => power.slice(power.lastIndexOf(":") + 1);

export const canEditCafe = (powers: readonly string[]): boolean =>
  powers.some((power) => {
    const action = powerAction(power);
    if (action === "read" || action === "dismiss") return false;
    if (power.startsWith("company:assistant:threads:")) return false;
    if (power.startsWith("platform:")) return false;
    return true;
  });

const TENANT_POWERS = ACCESS_POWERS.filter((power) => !power.startsWith("platform:"));
const PLATFORM_POWERS = ACCESS_POWERS.filter((power) => power.startsWith("platform:"));
const TENANT_READS = TENANT_POWERS.filter((power) => powerAction(power) === "read");
const TEAM_WRITES = TENANT_POWERS.filter(
  (power) => power.startsWith("company:team:") && powerAction(power) !== "read",
);

const STORE_STAFF_EXTRA = [
  "company:unanswered:questions:dismiss",
  "company:assistant:threads:create",
  "company:assistant:threads:update",
  "company:assistant:threads:delete",
] as const;

for (const power of STORE_STAFF_EXTRA) {
  if (!ACCESS_POWER_SET.has(power)) {
    throw new Error(`ACCESS_ROLE_GRANTS seed is not a catalogue leaf: ${power}`);
  }
}

export const ACCESS_ROLE_GRANTS = {
  tenant_admin: TENANT_POWERS,
  store_admin: TENANT_POWERS.filter((power) => !TEAM_WRITES.includes(power)),
  store_staff: [...TENANT_READS, ...STORE_STAFF_EXTRA],
  superuser: PLATFORM_POWERS,
} as const;
