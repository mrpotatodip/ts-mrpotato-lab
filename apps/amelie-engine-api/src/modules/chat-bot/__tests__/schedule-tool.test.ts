import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { tenantBusinessHours } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { getOpeningScheduleTool } from "#/modules/chat-bot/agent-tools";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import { createTestDb, defaultLocationId, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let otherCafeId: string;

const runtimeFor = (tenantId: string): ChatBotRuntime => ({
  db,
  owner: { kind: "user", tenantId, userId: "user-1" },

});

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella");
  otherCafeId = await insertTenant(db, "Other Cafe", "other-cafe");
  await db
    .insert(tenantBusinessHours)
    .values({ tenantId: sorellaId, locationId: await defaultLocationId(db, sorellaId), dayOfWeek: 6, opensAt: "08:00", closesAt: "16:00" });
});

describe("getOpeningSchedule tool", () => {
  it("reads the signed-in owner's Tenant", async () => {
    const result = await Effect.runPromise(getOpeningScheduleTool.execute({}, runtimeFor(sorellaId)));

    expect(result).toMatchObject({ timezone: "America/New_York" });
    expect(result).toHaveProperty("weekly.6", {
      weekday: "Saturday",
      isSet: true,
      isClosed: false,
      opensAt: "08:00",
      closesAt: "16:00",
    });
  });

  // -----
  // The Tenant is the server's, so another
  // owner never sees Sorella's hours.
  // -----
  it("never returns another Tenant's hours", async () => {
    const result = await Effect.runPromise(getOpeningScheduleTool.execute({}, runtimeFor(otherCafeId)));

    expect(result).toHaveProperty("weekly.6.isSet", false);
  });

  it("rejects any input, since the Tenant is never the model's to pick", async () => {
    const result = await Effect.runPromise(
      getOpeningScheduleTool.execute({ tenantId: sorellaId }, runtimeFor(otherCafeId)),
    );

    expect(result).toHaveProperty("error");
  });
});
