import { INVITE_CODE_MAX_USES_DEFAULT, type InviteCodeStatusValue } from "@repo/contracts/amelie";
import type { InviteCodeFormValues } from "../schemas";

export type InviteCodeStatusTone = "success" | "warning" | "info" | "danger" | "neutral";

export const INVITE_CODE_FORM_DEFAULTS: InviteCodeFormValues = {
  note: "",
  maxUses: String(INVITE_CODE_MAX_USES_DEFAULT),
  expiresAt: "",
};

const STATUS_LABELS = {
  active: "Active",
  used_up: "Used up",
  expired: "Expired",
  revoked: "Revoked",
} satisfies Record<InviteCodeStatusValue, string>;

const STATUS_TONES = {
  active: "success",
  used_up: "info",
  expired: "warning",
  revoked: "danger",
} satisfies Record<InviteCodeStatusValue, InviteCodeStatusTone>;

export function inviteCodeStatusLabel(status: InviteCodeStatusValue): string {
  return STATUS_LABELS[status];
}

export function inviteCodeStatusTone(status: InviteCodeStatusValue): InviteCodeStatusTone {
  return STATUS_TONES[status];
}

// -----
// A revoked code has nothing left to revoke.
// -----
export function canRevokeInviteCode(status: InviteCodeStatusValue): boolean {
  return status !== "revoked";
}

export function formatInviteCodeUses(useCount: number, maxUses: number): string {
  return `${useCount}/${maxUses}`;
}

export function buildInviteCodeSignUpLink(baseUrl: string, code: string): string {
  const origin = baseUrl.replace(/\/+$/, "");
  return `${origin}/signup?code=${encodeURIComponent(code)}`;
}

// -----
// A datetime-local value ("2026-10-10T12:00") is the
// admin's local time; the API wants an ISO instant.
// An empty or unreadable value means no expiry.
// -----
export function expiryInputToIso(value: string): string | null {
  if (value.trim() === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function toCreateInviteCodeBody(values: InviteCodeFormValues) {
  return {
    note: values.note,
    maxUses: Number(values.maxUses),
    expiresAt: expiryInputToIso(values.expiresAt),
  };
}
