import { describe, expect, it } from "vitest";
import system from "#/modules/system";
import { version } from "../../../../package.json";

describe("GET /health", () => {
  it("answers ok with the package version", async () => {
    const res = await system.request("/health");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: { ok: true, version }, error: null });
  });
});
