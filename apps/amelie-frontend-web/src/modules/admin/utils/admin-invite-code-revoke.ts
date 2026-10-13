import type { InviteCode } from "@repo/contracts/amelie";

export const withInviteCodeRevoked = (codes: InviteCode[], id: string, revokedAt: Date): InviteCode[] =>
  codes.map((code) => (code.id === id ? { ...code, status: "revoked", revokedAt: revokedAt.toISOString() } : code));
