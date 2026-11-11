import { describe, expect, it } from "vitest";
import { readInstallState, signInstallState, type InstallState } from "#/modules/github-installs/utils";

const SECRET = "test-secret-test-secret-test-secret";
const NOW = 1_800_000_000_000;
const state: InstallState = { accountId: "acme", userId: "ada", nonce: "n-1", expiresAt: NOW + 60_000 };

describe("install state", () => {
  it("reads back what was signed", async () => {
    const token = await signInstallState(SECRET, state);

    await expect(readInstallState(SECRET, token, NOW)).resolves.toEqual(state);
  });

  it("is not good once it has expired", async () => {
    const token = await signInstallState(SECRET, state);

    await expect(readInstallState(SECRET, token, NOW + 60_000)).resolves.toBeNull();
  });

  it("is refused under another secret", async () => {
    const token = await signInstallState(SECRET, state);

    await expect(readInstallState("another-secret-another-secret-12", token, NOW)).resolves.toBeNull();
  });

  it("is refused when the account in it was changed, because the signature no longer fits", async () => {
    const [, signature] = (await signInstallState(SECRET, state)).split(".");
    const forged = btoa(JSON.stringify({ ...state, accountId: "victim" })).replace(/=+$/, "");

    await expect(readInstallState(SECRET, `${forged}.${signature}`, NOW)).resolves.toBeNull();
  });

  it.each(["", "abc", "a.b.c", "....", "not base64!.also not"])("is refused when it is malformed: %j", async (token) => {
    await expect(readInstallState(SECRET, token, NOW)).resolves.toBeNull();
  });

  it("is different each time, because of the nonce", async () => {
    const first = await signInstallState(SECRET, state);
    const second = await signInstallState(SECRET, { ...state, nonce: "n-2" });

    expect(first).not.toBe(second);
  });
});
