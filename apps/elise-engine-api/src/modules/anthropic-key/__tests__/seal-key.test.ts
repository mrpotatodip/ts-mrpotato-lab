import { describe, expect, it } from "vitest";
import { openKey, sealKey } from "#/modules/anthropic-key/utils";

const SECRET = "test-secret-test-secret-test-secret";
const KEY = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz";

describe("sealKey and openKey", () => {
  it("opens what it sealed, and the sealed text does not hold the key", async () => {
    const sealed = await sealKey(SECRET, "acme", KEY);

    expect(sealed).not.toContain("sk-ant");
    expect(await openKey(SECRET, "acme", sealed)).toBe(KEY);
  });

  it("seals the same key to different text each time", async () => {
    expect(await sealKey(SECRET, "acme", KEY)).not.toBe(await sealKey(SECRET, "acme", KEY));
  });

  it.each([
    ["another secret", SECRET + "x", "acme"],
    ["another account", SECRET, "other"],
  ])("does not open with %s", async (_name, secret, accountId) => {
    const sealed = await sealKey(SECRET, "acme", KEY);

    expect(await openKey(secret, accountId, sealed)).toBeNull();
  });

  it.each([["no dot", "garbage"], ["damaged data", "AAAA.AAAA"], ["empty", ""]])("does not open %s", async (_name, sealed) => {
    expect(await openKey(SECRET, "acme", sealed)).toBeNull();
  });
});
