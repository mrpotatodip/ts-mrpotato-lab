import type { InviteCodeStatusValue } from "@repo/contracts/amelie";
import type { InviteCodeStatusInput } from "#/modules/invite-code/types";

// -----
// Revoked beats expired beats used up: the
// reason an admin most needs to see comes first.
// -----
export const deriveInviteCodeStatus = (row: InviteCodeStatusInput, now: Date): InviteCodeStatusValue => {
  if (row.revokedAt) return "revoked";
  if (row.expiresAt && row.expiresAt <= now) return "expired";
  if (row.useCount >= row.maxUses) return "used_up";
  return "active";
};
