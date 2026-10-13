import { describe, expect, it } from "vitest";
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_GROUP_SIZE,
  INVITE_CODE_LENGTH,
} from "#/modules/invite-code/constants";
import { deriveInviteCodeStatus, generateInviteCode, hashInviteCode, normalizeInviteCode } from "#/modules/invite-code";

describe("generateInviteCode", () => {
  it("makes 12 symbols in groups of four", () => {
    const code = generateInviteCode();

    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(code.replaceAll("-", "")).toHaveLength(INVITE_CODE_LENGTH);
    expect(code.split("-").every((group) => group.length === INVITE_CODE_GROUP_SIZE)).toBe(true);
  });

  it("never uses a look-alike", () => {
    const symbols = Array.from({ length: 200 }, generateInviteCode).join("").replaceAll("-", "");

    expect(symbols).not.toMatch(/[01OIL]/);
    expect([...symbols].every((symbol) => INVITE_CODE_ALPHABET.includes(symbol))).toBe(true);
  });

  it("does not repeat", () => {
    const codes = new Set(Array.from({ length: 500 }, generateInviteCode));

    expect(codes.size).toBe(500);
  });

  it("reaches every symbol of the alphabet", () => {
    const seen = new Set(Array.from({ length: 300 }, generateInviteCode).join(""));

    expect([...INVITE_CODE_ALPHABET].every((symbol) => seen.has(symbol))).toBe(true);
  });
});

describe("normalizeInviteCode", () => {
  it.each(["K7M2-9QXA-4TWB", "k7m2-9qxa-4twb", "k7m2 9qxa 4twb", "  K7M29QXA4TWB  ", "k7m2-9qxa 4twb"])(
    "turns %j into the bare upper-case symbols",
    (input) => {
      expect(normalizeInviteCode(input)).toBe("K7M29QXA4TWB");
    },
  );
});

describe("hashInviteCode", () => {
  it("is the same for every spelling of a code", async () => {
    const [a, b, c] = await Promise.all([
      hashInviteCode("K7M2-9QXA-4TWB"),
      hashInviteCode("k7m2 9qxa 4twb"),
      hashInviteCode("K7M29QXA4TWB"),
    ]);

    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("is a 64 character hex SHA-256", async () => {
    expect(await hashInviteCode("K7M2-9QXA-4TWB")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable: SHA-256 of the bare code", async () => {
    const expected = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode("K7M29QXA4TWB")),
    );

    expect(await hashInviteCode("K7M2-9QXA-4TWB")).toBe(
      Array.from(expected, (byte) => byte.toString(16).padStart(2, "0")).join(""),
    );
  });

  it("differs for a different code", async () => {
    expect(await hashInviteCode("K7M2-9QXA-4TWB")).not.toBe(await hashInviteCode("K7M2-9QXA-4TWC"));
  });
});

describe("deriveInviteCodeStatus", () => {
  const now = new Date("2026-10-09T12:00:00.000Z");
  const past = new Date("2026-10-01T00:00:00.000Z");
  const future = new Date("2026-12-01T00:00:00.000Z");
  const open = { revokedAt: null, expiresAt: null, useCount: 0, maxUses: 1 };

  it("is active while open", () => {
    expect(deriveInviteCodeStatus(open, now)).toBe("active");
    expect(deriveInviteCodeStatus({ ...open, expiresAt: future }, now)).toBe("active");
  });

  it("is used_up when every use is taken", () => {
    expect(deriveInviteCodeStatus({ ...open, useCount: 1 }, now)).toBe("used_up");
  });

  it("is expired once the expiry has passed", () => {
    expect(deriveInviteCodeStatus({ ...open, expiresAt: past }, now)).toBe("expired");
  });

  it("is revoked before anything else", () => {
    expect(deriveInviteCodeStatus({ ...open, revokedAt: past, expiresAt: past, useCount: 1 }, now)).toBe(
      "revoked",
    );
  });
});
