import { describe, expect, it } from "vitest";
import { fingerprintOf } from "#/modules/scan-records/utils";

describe("fingerprintOf", () => {
  it("is the same for the same problem, whatever its line or spacing", async () => {
    const first = await fingerprintOf("authz", "src/a.ts", "Missing  owner check");
    const second = await fingerprintOf("authz", "src/a.ts", "  missing owner CHECK ");

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs when the class, the file or the title differs", async () => {
    const base = await fingerprintOf("authz", "src/a.ts", "Missing owner check");

    expect(await fingerprintOf("injection", "src/a.ts", "Missing owner check")).not.toBe(base);
    expect(await fingerprintOf("authz", "src/b.ts", "Missing owner check")).not.toBe(base);
    expect(await fingerprintOf("authz", "src/a.ts", "Missing role check")).not.toBe(base);
    expect(await fingerprintOf("authz", null, "Missing owner check")).not.toBe(base);
  });
});
