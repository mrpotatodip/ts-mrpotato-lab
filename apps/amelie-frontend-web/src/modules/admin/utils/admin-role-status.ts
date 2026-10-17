import type { AdminRole } from "@repo/contracts/amelie";
import type { InviteCodeStatusTone } from "./admin-invite-code";

export function adminRoleStatusLabel(role: Pick<AdminRole, "scope" | "enabled">): string {
  if (role.scope === "platform") return "Platform";
  return role.enabled ? "Enabled" : "Disabled";
}

export function adminRoleStatusTone(role: Pick<AdminRole, "scope" | "enabled">): InviteCodeStatusTone {
  if (role.scope === "platform") return "info";
  return role.enabled ? "success" : "neutral";
}

// -----
// Why a role cannot be switched off, or null when it can.
// -----
export function adminRoleDisableBlocker(role: Pick<AdminRole, "scope" | "isSystem">): string | null {
  if (role.scope === "platform") return "A platform role is always on.";
  if (role.isSystem) return "A system role cannot be disabled.";
  return null;
}

// -----
// Why a role cannot be deleted, or null when it can. The
// server also refuses a role an invite points at.
// -----
export function adminRoleDeleteBlocker(role: Pick<AdminRole, "isSystem" | "holderCount">): string | null {
  if (role.isSystem) return "A system role cannot be deleted.";
  if (role.holderCount > 0) {
    const who = role.holderCount === 1 ? "1 person holds" : `${role.holderCount} people hold`;
    return `${who} this role. Disable it instead.`;
  }
  return null;
}

export function adminRoleCanToggle(role: Pick<AdminRole, "scope" | "isSystem" | "enabled">): boolean {
  return role.scope === "tenant" && (!role.enabled || adminRoleDisableBlocker(role) === null);
}

export function formatAdminHolderCount(count: number): string {
  return count === 1 ? "1 person" : `${count} people`;
}

export function formatAdminPowerCount(count: number): string {
  return count === 1 ? "1 power" : `${count} powers`;
}
