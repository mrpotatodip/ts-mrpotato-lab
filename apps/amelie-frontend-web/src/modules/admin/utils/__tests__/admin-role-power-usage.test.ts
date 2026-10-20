import { describe, expect, it } from "vitest";
import { ACCESS_POWER_USAGE, isAccessPower } from "@repo/contracts/amelie";
import { adminPowerUsageLines } from "../admin-role-power-usage";

const usage = {
  "company:menu:items:read": { guard: "plain" as const, routes: ["GET /menu"], tools: [] },
  "company:menu:items:update": { guard: "plain" as const, routes: ["PUT /menu/items/:itemId"], tools: ["updateMenuItem"] },
};

describe("adminPowerUsageLines", () => {
  it("lists the routes and tools that check each Action", () => {
    const lines = adminPowerUsageLines(
      [
        { power: "company:menu:items:read", action: "read" },
        { power: "company:menu:items:update", action: "update" },
      ],
      usage,
    );

    expect(lines).toEqual([
      { power: "company:menu:items:read", action: "read", routes: ["GET /menu"], tools: [], note: null },
      {
        power: "company:menu:items:update",
        action: "update",
        routes: ["PUT /menu/items/:itemId"],
        tools: ["updateMenuItem"],
        note: null,
      },
    ]);
  });

  it("says when nothing checks a Power yet", () => {
    const [line] = adminPowerUsageLines([{ power: "company:menu:items:delete", action: "delete" }], usage);

    expect(line).toMatchObject({ routes: [], tools: [], note: "Not checked anywhere yet." });
  });

  it("says a platform Power is guarded by the superuser check", () => {
    const [line] = adminPowerUsageLines([{ power: "platform:admin:invite_codes:read", action: "read" }], usage);

    expect(line.note).toContain("superuser check");
  });

  it("reads the recorded map by default, and only for real Powers", () => {
    const [line] = adminPowerUsageLines([{ power: "company:team:invites:create", action: "create" }]);

    expect(line.routes).toEqual(["POST /team/invites"]);
    expect(Object.keys(ACCESS_POWER_USAGE).every((power) => isAccessPower(power))).toBe(true);
  });
});
