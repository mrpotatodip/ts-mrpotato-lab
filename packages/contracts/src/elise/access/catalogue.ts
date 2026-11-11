import type { AccessActionValue } from "../enums";

export type AccessNode = {
  key: string;
  label: string;
  actions?: readonly AccessActionValue[];
  bound?: true | readonly AccessActionValue[];
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
      { key: "dashboard", label: "Dashboard", actions: ["read"] },
      { key: "summary", label: "Summary", actions: ["read"] },
      { key: "plan", label: "Plan", actions: ["read"] },
      {
        key: "team",
        label: "Team",
        children: [
          { key: "members", label: "Member", actions: ["read", "update", "delete"] },
          { key: "invites", label: "Team invite", actions: ["read", "create", "update", "delete"] },
          { key: "groups", label: "Group", actions: ["read", "create", "update", "delete"] },
        ],
      },
      {
        key: "github",
        label: "GitHub",
        children: [{ key: "installations", label: "GitHub installation", actions: ["create", "delete"] }],
      },
      { key: "runners", label: "Runner", actions: ["create", "delete"] },
      {
        key: "findings",
        label: "Findings",
        children: [{ key: "accepted_risk", label: "Accepted risk", actions: ["update"] }],
      },
      {
        key: "usage",
        label: "Usage",
        children: [
          { key: "budget", label: "Monthly scan budget", actions: ["update"] },
          { key: "anthropic_key", label: "Anthropic API key", actions: ["update"] },
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

type NodePowers<Node, Prefix extends string> = Node extends { readonly key: infer Key extends string }
  ? `${Prefix}${Key}` extends infer Path extends string
    ?
        | (Node extends { readonly actions: readonly (infer Action extends string)[] } ? `${Path}:${Action}` : never)
        | (Node extends { readonly children: readonly (infer Child)[] } ? NodePowers<Child, `${Path}:`> : never)
    : never
  : never;

// -----
// Every Power the catalogue holds, as a union of its exact
// strings, built from the tree itself. A misspelt Power fails
// the build wherever it is written.
// -----
export type AccessPower = NodePowers<AccessCatalogue[number], "">;

type BoundNodePowers<Node, Prefix extends string> = Node extends { readonly key: infer Key extends string }
  ? `${Prefix}${Key}` extends infer Path extends string
    ?
        | (Node extends { readonly bound: true; readonly actions: readonly (infer Action extends string)[] }
            ? `${Path}:${Action}`
            : never)
        | (Node extends { readonly bound: readonly (infer Action extends string)[] } ? `${Path}:${Action}` : never)
        | (Node extends { readonly children: readonly (infer Child)[] } ? BoundNodePowers<Child, `${Path}:`> : never)
    : never
  : never;

export type BoundPower = BoundNodePowers<AccessCatalogue[number], "">;
export type UnboundPower = Exclude<AccessPower, BoundPower>;

const collectBoundPowers = (node: AccessNode, prefix: string): string[] => {
  const path = prefix === "" ? node.key : `${prefix}:${node.key}`;
  const boundActions = node.bound === true ? (node.actions ?? []) : (node.bound ?? []);
  const own = boundActions.map((action) => `${path}:${action}`);
  return [...own, ...(node.children ?? []).flatMap((child) => collectBoundPowers(child, path))];
};

const collectPowers =(node: AccessNode, prefix: string): string[] => {
  const path = prefix === "" ? node.key : `${prefix}:${node.key}`;
  const own = (node.actions ?? []).map((action) => `${path}:${action}`);
  const nested = (node.children ?? []).flatMap((child) => collectPowers(child, path));
  return [...own, ...nested];
};

// SAFETY: collectPowers joins keys and Actions with the same colons NodePowers uses, so each string it builds is an AccessPower.
export const ACCESS_POWERS = ACCESS_CATALOGUE.flatMap((node) => collectPowers(node, "")) as AccessPower[];

// SAFETY: collectBoundPowers walks the same tree and joins keys exactly as BoundNodePowers does.
export const BOUND_POWERS = ACCESS_CATALOGUE.flatMap((node) => collectBoundPowers(node, "")) as BoundPower[];

const BOUND_POWER_SET: ReadonlySet<string> = new Set(BOUND_POWERS);

export const isBoundPower = (power: AccessPower): power is BoundPower => BOUND_POWER_SET.has(power);

const ACCESS_POWER_SET:ReadonlySet<string> = new Set(ACCESS_POWERS);

export const isAccessPower = (value: string): value is AccessPower => ACCESS_POWER_SET.has(value);

export const hasAccessPower = (grants: readonly string[], power: AccessPower): boolean => grants.includes(power);

// -----
// A Watcher holds the Summary Power and not the Dashboard Power. Both
// are needed, so an engine that does not grant the Summary Power yet
// (before its migration) restricts nobody.
// -----
export const isWatcher = (grants: readonly string[]): boolean => hasAccessPower(grants, "company:summary:read") && !hasAccessPower(grants, "company:dashboard:read");

const powerAction = (power: string): string => power.slice(power.lastIndexOf(":") + 1);

export const canEditAccount = (powers: readonly string[]): boolean =>
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

// -----
// The owner keeps what changes the people already in the account.
// A Workspace admin invites and revokes, runs groups, connects
// GitHub and accepts risk; a Workspace member does none of it
// and sees no part of Team.
// -----
const OWNER_ONLY = ["company:team:members:update", "company:team:members:delete"] as const;
const WORKSPACE_ADMIN_POWERS = TENANT_POWERS.filter((power) => !OWNER_ONLY.some((owner) => owner === power));
const WORKSPACE_MEMBER_READS = TENANT_READS.filter((power) => !power.startsWith("company:team:"));

const WORKSPACE_MEMBER_EXTRA = [
  "company:unanswered:questions:dismiss",
  "company:assistant:threads:create",
  "company:assistant:threads:update",
  "company:assistant:threads:delete",
] as const;

for (const power of WORKSPACE_MEMBER_EXTRA) {
  if (!ACCESS_POWER_SET.has(power)) {
    throw new Error(`ACCESS_ROLE_GRANTS seed is not a catalogue leaf: ${power}`);
  }
}

export const ACCESS_ROLE_GRANTS = {
  tenant_admin: TENANT_POWERS,
  workspace_admin: WORKSPACE_ADMIN_POWERS,
  workspace_member: [...WORKSPACE_MEMBER_READS, ...WORKSPACE_MEMBER_EXTRA],
  workspace_watcher: ["company:summary:read"],
  superuser: PLATFORM_POWERS,
} as const;
