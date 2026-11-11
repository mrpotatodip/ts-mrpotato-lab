import { afterEach, describe, expect, it, vi } from "vitest";
import { ScanListSchema } from "@repo/contracts/elise";
import { EngineError, engineFetch, engineJson } from "#/lib/engine-client";

const answer = (body: string, status = 200) => vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status })));

afterEach(() => vi.unstubAllGlobals());

describe("engineFetch", () => {
  it("sends the session token and account id", async () => {
    answer(JSON.stringify({ data: null, error: null }));
    await engineFetch("/scans", {}, { token: "t", accountId: "a" });
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(url).toBe("http://engine.test/scans");
    expect(headers.get("authorization")).toBe("Bearer t");
    expect(headers.get("x-account-id")).toBe("a");
  });

  it("reads the engine error envelope", async () => {
    answer(JSON.stringify({ data: null, error: { code: "FORBIDDEN", message: "No role" } }), 403);
    await expect(engineFetch("/scans")).rejects.toMatchObject({ status: 403, code: "FORBIDDEN", message: "No role" });
  });

  it("reads a Better Auth error body", async () => {
    answer(JSON.stringify({ code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" }), 401);
    await expect(engineFetch("/auth/sign-in/email")).rejects.toBeInstanceOf(EngineError);
  });
});

describe("engineJson", () => {
  it("unwraps data and parses it with the contract schema", async () => {
    answer(JSON.stringify({ data: { scans: [], nextCursor: null }, error: null }));
    expect(await engineJson(ScanListSchema, "/scans")).toEqual({ scans: [], nextCursor: null });
  });

  it("rejects a body that breaks the contract", async () => {
    answer(JSON.stringify({ data: { scans: "nope" }, error: null }));
    await expect(engineJson(ScanListSchema, "/scans")).rejects.toThrow("scans");
  });

  it("names the route and the missing field when the engine is older than the contract", async () => {
    answer(JSON.stringify({ data: { scans: [{ scanId: "s" }], nextCursor: null }, error: null }));
    const failure = engineJson(ScanListSchema, "/scans");
    await expect(failure).rejects.toBeInstanceOf(EngineError);
    await expect(failure).rejects.toThrow(/unexpected response for \/scans: scans\.0\./);
    await expect(failure).rejects.toThrow("older than this dashboard");
  });
});
