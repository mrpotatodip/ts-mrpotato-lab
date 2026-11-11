import { describe, expect, it } from "vitest";
import { bearerTokenOf, generatePairingCode, generateRunnerToken, hashPairingCode, normalizePairingCode } from "#/modules/runners/utils";

describe("pairing codes", () => {
  it("are two groups of four from the safe alphabet", () => {
    expect(generatePairingCode()).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });

  it.each(["k7qm-4txd", "K7QM4TXD", " k7qm 4txd ", "K7QM-4TXD"])("find one hash however %j is typed", async (typed) => {
    expect(normalizePairingCode(typed)).toBe("K7QM4TXD");
    expect(await hashPairingCode(typed)).toBe(await hashPairingCode("K7QM-4TXD"));
  });
});

describe("runner tokens", () => {
  it("start with the prefix and differ each time", () => {
    const [a, b] = [generateRunnerToken(), generateRunnerToken()];
    expect(a).toMatch(/^elr_[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it.each([
    ["Bearer elr_abc", "elr_abc"],
    ["bearer elr_abc", "elr_abc"],
    ["Basic elr_abc", null],
    ["Bearer", null],
    [undefined, null],
  ])("reads the bearer of %j", (header, token) => {
    expect(bearerTokenOf(header)).toBe(token);
  });
});
