import { describe, expect, it } from "vitest";
import {
  buildInviteCodeSignUpLink,
  canRevokeInviteCode,
  expiryInputToIso,
  formatInviteCodeUses,
  inviteCodeStatusLabel,
  inviteCodeStatusTone,
  toCreateInviteCodeBody,
} from "../admin-invite-code";

describe("invite code status", () => {
  it("labels every status", () => {
    expect(inviteCodeStatusLabel("active")).toBe("Active");
    expect(inviteCodeStatusLabel("used_up")).toBe("Used up");
    expect(inviteCodeStatusLabel("expired")).toBe("Expired");
    expect(inviteCodeStatusLabel("revoked")).toBe("Revoked");
  });

  it("colours active green, revoked red, and keeps the others apart", () => {
    expect(inviteCodeStatusTone("active")).toBe("success");
    expect(inviteCodeStatusTone("revoked")).toBe("danger");
    expect(inviteCodeStatusTone("used_up")).not.toBe(inviteCodeStatusTone("expired"));
  });

  it("offers Revoke for everything except a revoked code", () => {
    expect(canRevokeInviteCode("active")).toBe(true);
    expect(canRevokeInviteCode("used_up")).toBe(true);
    expect(canRevokeInviteCode("expired")).toBe(true);
    expect(canRevokeInviteCode("revoked")).toBe(false);
  });
});

describe("formatInviteCodeUses", () => {
  it("reads used over max", () => {
    expect(formatInviteCodeUses(1, 1)).toBe("1/1");
    expect(formatInviteCodeUses(0, 25)).toBe("0/25");
  });
});

describe("buildInviteCodeSignUpLink", () => {
  it("puts the code in the query of /signup", () => {
    expect(buildInviteCodeSignUpLink("https://helloelise.app", "K7M2-9QXA-4TWB")).toBe(
      "https://helloelise.app/signup?code=K7M2-9QXA-4TWB",
    );
  });

  it("does not double the slash and encodes the code", () => {
    expect(buildInviteCodeSignUpLink("http://localhost:3000/", "a b&c")).toBe(
      "http://localhost:3000/signup?code=a%20b%26c",
    );
  });
});

describe("expiryInputToIso", () => {
  it("returns null for an empty or unreadable value", () => {
    expect(expiryInputToIso("")).toBeNull();
    expect(expiryInputToIso("   ")).toBeNull();
    expect(expiryInputToIso("not a date")).toBeNull();
  });

  it("turns a local datetime into an ISO instant", () => {
    const iso = expiryInputToIso("2030-01-02T03:04");
    expect(iso).toBe(new Date(2030, 0, 2, 3, 4).toISOString());
    expect(iso).toMatch(/Z$/);
  });
});

describe("toCreateInviteCodeBody", () => {
  it("converts the typed strings", () => {
    expect(toCreateInviteCodeBody({ note: "Maria", maxUses: "3", expiresAt: "" })).toEqual({
      note: "Maria",
      maxUses: 3,
      expiresAt: null,
    });
  });
});
