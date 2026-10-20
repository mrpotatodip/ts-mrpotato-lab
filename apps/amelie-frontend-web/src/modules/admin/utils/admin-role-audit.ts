import type { AdminAuditEntry } from "@repo/contracts/amelie";
import type { AdminAuditDescription } from "../types";
import { AdminAuditBindableSchema, AdminAuditPowersSchema, AdminAuditSummarySchema } from "../schemas";

const quoted = (label: string) => `"${label}"`;

const powersDescription = (entry: AdminAuditEntry): AdminAuditDescription => {
  const before = AdminAuditPowersSchema.safeParse(entry.before);
  const after = AdminAuditPowersSchema.safeParse(entry.after);
  if (!before.success || !after.success) return { title: "Powers changed", details: [] };
  const was = new Set(before.data.powers);
  const now = new Set(after.data.powers);
  const added = after.data.powers.filter((power) => !was.has(power));
  const removed = before.data.powers.filter((power) => !now.has(power));
  return {
    title: `Powers changed: ${added.length} added, ${removed.length} removed`,
    details: [...added.map((power) => `+ ${power}`), ...removed.map((power) => `- ${power}`)],
  };
};

const updatedDescription = (entry: AdminAuditEntry): AdminAuditDescription => {
  const before = AdminAuditSummarySchema.safeParse(entry.before);
  const after = AdminAuditSummarySchema.safeParse(entry.after);
  if (!before.success || !after.success) return { title: "Role edited", details: [] };
  const details = [
    ...(before.data.label === after.data.label
      ? []
      : [`Label: ${quoted(before.data.label)} to ${quoted(after.data.label)}`]),
    ...(before.data.description === after.data.description ? [] : ["Description changed"]),
  ];
  return { title: "Role edited", details };
};

const labelled = (verb: string, payload: AdminAuditEntry["after"]): AdminAuditDescription => {
  const summary = AdminAuditSummarySchema.safeParse(payload);
  return { title: summary.success ? `${verb} ${quoted(summary.data.label)}` : verb, details: [] };
};

// -----
// One audit entry as a line a person can read, with the
// individual changes underneath.
// -----
export function describeAdminAuditEntry(entry: AdminAuditEntry): AdminAuditDescription {
  switch (entry.action) {
    case "role.created":
      return labelled("Created", entry.after);
    case "role.updated":
      return updatedDescription(entry);
    case "role.enabled":
      return { title: "Enabled for every cafe", details: [] };
    case "role.disabled":
      return { title: "Disabled: no new assignments", details: [] };
    case "role.powers_set":
      return powersDescription(entry);
    case "role.can_be_bound_set":
      return {
        title: AdminAuditBindableSchema.safeParse(entry.after).data?.canBeBound
          ? "Members can now be limited to a Country or Location"
          : "Members can no longer be limited to a Country or Location",
        details: [],
      };
    case "role.deleted":
      return labelled("Deleted", entry.before);
    default:
      return { title: entry.action, details: [] };
  }
}
