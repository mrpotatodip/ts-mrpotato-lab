import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { tenantBusinessHours, tenantBusinessProfiles } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { getBusinessProfileTool, getOpeningScheduleTool } from "#/modules/chat-bot/agent-tools";
import type { ChatBotRuntime, ChatBotToolSpec } from "#/modules/chat-bot/types";
import { createTestDb, defaultLocationId, insertLocation, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let oneLocationTenantId: string;
let tenantId: string;
let downtownId: string;
let airportId: string;

const run = (tool: ChatBotToolSpec, input: Parameters<ChatBotToolSpec["execute"]>[0], forTenant: string) => {
  const runtime: ChatBotRuntime = {
    db,
    owner: { kind: "anonymous", tenantId: forTenant, anonymousId: "mcp:203.0.113.7" },
  };
  return Effect.runPromise(tool.execute(input, runtime));
};

beforeAll(async () => {
  db = await createTestDb();
  oneLocationTenantId = await insertTenant(db, "Solo Cafe", "solo");
  tenantId = await insertTenant(db, "Two Branch Cafe", "two-branch");
  downtownId = await defaultLocationId(db, tenantId);
  airportId = await insertLocation(db, tenantId, {
    name: "Airport",
    slug: "airport",
    timezone: "Asia/Tokyo",
    address: "Terminal 2",
    phone: "555-0002",
  });
  await db.insert(tenantBusinessHours).values([
    { tenantId: oneLocationTenantId, locationId: await defaultLocationId(db, oneLocationTenantId), dayOfWeek: 6, opensAt: "08:00", closesAt: "16:00" },
    { tenantId, locationId: downtownId, dayOfWeek: 6, opensAt: "08:00", closesAt: "16:00" },
    { tenantId, locationId: airportId, dayOfWeek: 6, opensAt: "05:00", closesAt: "23:00" },
  ]);
});

describe("getOpeningSchedule with Locations", () => {
  it("uses the only Location silently when no locationId is given", async () => {
    expect(await run(getOpeningScheduleTool, {}, oneLocationTenantId)).toHaveProperty("weekly.6.opensAt", "08:00");
  });

  it("returns the chosen Location's hours and timezone", async () => {
    const airport = await run(getOpeningScheduleTool, { locationId: airportId }, tenantId);
    const downtown = await run(getOpeningScheduleTool, { locationId: downtownId }, tenantId);

    expect(airport).toMatchObject({ timezone: "Asia/Tokyo", location: { id: airportId, name: "Airport" } });
    expect(airport).toHaveProperty("weekly.6.opensAt", "05:00");
    expect(downtown).toHaveProperty("weekly.6.opensAt", "08:00");
  });

  it("returns a needs-location result listing the options when there are several and none is given", async () => {
    expect(await run(getOpeningScheduleTool, {}, tenantId)).toEqual({
      needsLocation: true,
      message: "This cafe has several locations. Ask which one: Two Branch Cafe, Airport. Then call setThreadLocation.",
      locations: [
        { id: downtownId, name: "Two Branch Cafe" },
        { id: airportId, name: "Airport" },
      ],
    });
  });

  it("ignores another Tenant's Location and asks which one", async () => {
    const foreign = await defaultLocationId(db, oneLocationTenantId);

    expect(await run(getOpeningScheduleTool, { locationId: foreign }, tenantId)).toMatchObject({
      needsLocation: true,
      message: expect.stringContaining("ignored"),
    });
  });
});

describe("getBusinessProfile with Locations", () => {
  it("returns the chosen Location's address and phone", async () => {
    expect(await run(getBusinessProfileTool, { locationId: airportId }, tenantId)).toMatchObject({
      address: "Terminal 2",
      phone: "555-0002",
      location: { id: airportId, name: "Airport" },
      country: { code: "US", name: "United States" },
    });
  });

  it("keeps the Tenant-wide facts and lists the options when there are several Locations and none is given", async () => {
    await db.insert(tenantBusinessProfiles).values({
      tenantId,
      description: "Both branches",
      websiteUrl: "https://two.test",
      email: "hello@two.test",
    });

    expect(await run(getBusinessProfileTool, {}, tenantId)).toMatchObject({
      description: "Both branches",
      websiteUrl: "https://two.test",
      email: "hello@two.test",
      address: null,
      phone: null,
      location: null,
      country: null,
      needsLocation: true,
      locations: [
        { id: downtownId, name: "Two Branch Cafe" },
        { id: airportId, name: "Airport" },
      ],
    });
  });

  it("answers a one-Location Tenant without asking", async () => {
    expect(await run(getBusinessProfileTool, {}, oneLocationTenantId)).toMatchObject({
      phone: null,
      address: null,
      location: { name: "Solo Cafe" },
      country: { code: "US", name: "United States" },
    });
  });
});
