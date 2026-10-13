import { describe, expect, it } from "vitest";
import type { InviteCode } from "@repo/contracts/amelie";
import { withInviteCodeRevoked } from "../admin-invite-code-revoke";

const code = (id: string): InviteCode => ({
  id,
  note: "",
  status: "active",
  useCount: 0,
  maxUses: 1,
  createdAt: "2026-10-01T08:00:00.000Z",
  expiresAt: null,
  revokedAt: null,
  createdByName: "Admin",
});

const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";

describe("withInviteCodeRevoked", () => {
  it("marks the code revoked at the given time", () => {
    const [revoked] = withInviteCodeRevoked([code(A), code(B)], A, new Date("2026-10-12T08:00:00.000Z"));
    expect(revoked.status).toBe("revoked");
    expect(revoked.revokedAt).toBe("2026-10-12T08:00:00.000Z");
  });

  it("leaves other codes alone", () => {
    const codes = [code(A), code(B)];
    expect(withInviteCodeRevoked(codes, A, new Date())[1]).toBe(codes[1]);
  });
});
