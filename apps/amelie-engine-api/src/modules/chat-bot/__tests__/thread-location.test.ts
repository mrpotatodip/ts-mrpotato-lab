import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { chatBotThreadSessions, chatBotThreads, tenantBusinessHours, tenantLocations } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import {
  getBusinessProfileTool,
  getOpeningScheduleTool,
  removeHoursOverrideTool,
  setBusinessHoursTool,
  setHoursOverrideTool,
  setThreadLocationTool,
} from "#/modules/chat-bot/agent-tools";
import type { ChatBotRuntime, ChatBotToolSpec } from "#/modules/chat-bot/types";
import {
  createTestDb,
  defaultLocationId,
  insertLocation,
  insertMember,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let downtownId: string;
let airportId: string;
let otherTenantLocationId: string;
let ownerUserId: string;

const newThread = async (locationId: string | null, user: string | null = null) => {
  const [thread] = await db.insert(chatBotThreads).values({}).returning({ id: chatBotThreads.id });
  await db.insert(chatBotThreadSessions).values({
    threadId: thread.id,
    tenantId,
    locationId,
    anonymousId: user ? null : "anon-1",
    userId: user,
    expiresAt: user ? null : new Date("2999-01-01"),
  });
  return thread.id;
};

const threadLocation = async (threadId: string) => {
  const [row] = await db
    .select({ locationId: chatBotThreadSessions.locationId })
    .from(chatBotThreadSessions)
    .where(eq(chatBotThreadSessions.threadId, threadId));
  return row.locationId;
};

const run = (tool: ChatBotToolSpec, input: Parameters<ChatBotToolSpec["execute"]>[0], threadId: string, asOwner = false) => {
  const runtime: ChatBotRuntime = {
    db,
    threadId,
    owner: asOwner
      ? { kind: "user", tenantId, userId: ownerUserId }
      : { kind: "anonymous", tenantId, anonymousId: "anon-1" },
  };
  return Effect.runPromise(tool.execute(input, runtime));
};

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Two Branch Cafe", "two-branch");
  downtownId = await defaultLocationId(db, tenantId);
  airportId = await insertLocation(db, tenantId, {
    name: "Airport",
    slug: "airport",
    timezone: "Asia/Tokyo",
    address: "Terminal 2",
    phone: "555-0002",
  });
  otherTenantLocationId = await defaultLocationId(db, await insertTenant(db, "Other Cafe", "other"));
  await db.insert(tenantBusinessHours).values([
    { tenantId, locationId: downtownId, dayOfWeek: 6, opensAt: "08:00", closesAt: "16:00" },
    { tenantId, locationId: airportId, dayOfWeek: 6, opensAt: "05:00", closesAt: "23:00" },
  ]);
  const login = await insertPersonWithLogin(db, "owner@two-branch.test");
  await insertMember(db, tenantId, login.partyId, "tenant_admin");
  ownerUserId = login.userId;
});

describe("tools take the Location from the Thread", () => {
  it("answers with the Thread's Location hours when the input names none", async () => {
    const threadId = await newThread(airportId);

    expect(await run(getOpeningScheduleTool, {}, threadId)).toMatchObject({
      location: { id: airportId, name: "Airport" },
      weekly: expect.arrayContaining([expect.objectContaining({ opensAt: "05:00" })]),
    });
    expect(await run(getBusinessProfileTool, {}, threadId)).toMatchObject({ address: "Terminal 2" });
  });

  it("lets a model-supplied locationId override the Thread's", async () => {
    const threadId = await newThread(airportId);

    expect(await run(getOpeningScheduleTool, { locationId: downtownId }, threadId)).toMatchObject({
      location: { id: downtownId },
    });
  });

  it("still asks which location when the Thread has none", async () => {
    const threadId = await newThread(null);

    expect(await run(getOpeningScheduleTool, {}, threadId)).toMatchObject({ needsLocation: true });
  });

  it("ignores a Thread Location that has since been archived", async () => {
    const closingId = await insertLocation(db, tenantId, { name: "Pop-up", slug: "pop-up" });
    const threadId = await newThread(closingId);
    await db.update(tenantLocations).set({ archivedAt: new Date() }).where(eq(tenantLocations.id, closingId));

    expect(await run(getOpeningScheduleTool, {}, threadId)).toMatchObject({ needsLocation: true });
  });
});

describe("setThreadLocation", () => {
  it("stores the pick on the Thread, by name, slug or id", async () => {
    const threadId = await newThread(null);

    expect(await run(setThreadLocationTool, { location: "airport" }, threadId)).toEqual({
      location: { id: airportId, name: "Airport" },
    });
    expect(await threadLocation(threadId)).toBe(airportId);

    await run(setThreadLocationTool, { location: "Two Branch Cafe" }, threadId);
    expect(await threadLocation(threadId)).toBe(downtownId);

    await run(setThreadLocationTool, { location: airportId }, threadId);
    expect(await threadLocation(threadId)).toBe(airportId);
  });

  it("then answers hours for the pick", async () => {
    const threadId = await newThread(null);
    await run(setThreadLocationTool, { location: "airport" }, threadId);

    expect(await run(getOpeningScheduleTool, {}, threadId)).toMatchObject({ location: { id: airportId } });
  });

  it("rejects another Tenant's Location and keeps the current one", async () => {
    const threadId = await newThread(downtownId);

    expect(await run(setThreadLocationTool, { location: otherTenantLocationId }, threadId)).toEqual({
      error: "Location not found. Choose one of: Two Branch Cafe, Airport",
    });
    expect(await threadLocation(threadId)).toBe(downtownId);
  });

  it("rejects an archived Location", async () => {
    const goneId = await insertLocation(db, tenantId, { name: "Old Kiosk", slug: "old-kiosk" });
    await db.update(tenantLocations).set({ archivedAt: new Date() }).where(eq(tenantLocations.id, goneId));
    const threadId = await newThread(null);

    expect(await run(setThreadLocationTool, { location: "old-kiosk" }, threadId)).toHaveProperty("error");
    expect(await threadLocation(threadId)).toBeNull();
  });
});

describe("admin hours tools on a multi-Location Tenant", () => {
  const closed = { date: "2999-12-25", isClosed: true, opensAt: null, closesAt: null, note: null };

  it("write to the Thread's Location", async () => {
    const threadId = await newThread(airportId, ownerUserId);

    await run(setHoursOverrideTool, closed, threadId, true);
    await run(setBusinessHoursTool, { weekday: "Monday", isClosed: true, opensAt: null, closesAt: null }, threadId, true);

    const airport = await run(getOpeningScheduleTool, { locationId: airportId }, threadId, true);
    const downtown = await run(getOpeningScheduleTool, { locationId: downtownId }, threadId, true);
    expect(airport).toHaveProperty("specialDates", [closed]);
    expect(airport).toHaveProperty("weekly.1.isClosed", true);
    expect(downtown).toHaveProperty("specialDates", []);
  });

  it("take an explicit locationId, which overrides the Thread's", async () => {
    const threadId = await newThread(airportId, ownerUserId);

    await run(setHoursOverrideTool, { ...closed, date: "2999-12-26", locationId: downtownId }, threadId, true);
    expect(await run(getOpeningScheduleTool, { locationId: downtownId }, threadId, true)).toHaveProperty(
      "specialDates",
      [{ ...closed, date: "2999-12-26" }],
    );

    expect(await run(removeHoursOverrideTool, { date: "2999-12-26", locationId: downtownId }, threadId, true)).toEqual({
      date: "2999-12-26",
    });
  });

  it("remove from the Thread's Location", async () => {
    const threadId = await newThread(airportId, ownerUserId);
    await run(setHoursOverrideTool, { ...closed, date: "2999-11-01" }, threadId, true);

    expect(await run(removeHoursOverrideTool, { date: "2999-11-01" }, threadId, true)).toEqual({ date: "2999-11-01" });
  });

  it("answer needs-location with the options when the Thread has none, and write nothing", async () => {
    const threadId = await newThread(null, ownerUserId);
    const needed = {
      needsLocation: true,
      message: expect.stringContaining("several locations"),
      locations: [
        { id: downtownId, name: "Two Branch Cafe" },
        { id: airportId, name: "Airport" },
      ],
    };

    expect(await run(setHoursOverrideTool, { ...closed, date: "2999-10-10" }, threadId, true)).toMatchObject(needed);
    expect(
      await run(setBusinessHoursTool, { weekday: "Friday", isClosed: true, opensAt: null, closesAt: null }, threadId, true),
    ).toMatchObject(needed);
    expect(await run(removeHoursOverrideTool, { date: "2999-10-10" }, threadId, true)).toMatchObject(needed);
  });
});
