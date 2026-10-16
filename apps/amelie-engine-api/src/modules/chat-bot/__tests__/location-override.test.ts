import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { ChatBotJson, ChatBotToolError } from "@repo/contracts/chat-bots";
import {
  chatBotThreadSessions,
  chatBotThreads,
  tenantBusinessHours,
  tenantFaqs,
  tenantLocations,
  tenantMenuCategories,
} from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import {
  findMenuItemsTool,
  getBusinessProfileTool,
  getOpeningScheduleTool,
  listFaqsTool,
  listMenuTool,
  removeHoursOverrideTool,
  setBusinessHoursTool,
  setHoursOverrideTool,
} from "#/modules/chat-bot/agent-tools";
import type { ChatBotRuntime, ChatBotToolSpec } from "#/modules/chat-bot/types";
import { createTestDb, defaultLocationId, insertLocation, insertMember, insertMenuItem, insertPersonWithLogin, insertTenant } from "#/__tests__/amelie-test-db";

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
  await db.update(tenantLocations).set({ name: "Downtown", slug: "downtown", phone: "555-0001" }).where(
    eq(tenantLocations.id, downtownId),
  );
  airportId = await insertLocation(db, tenantId, {
    name: "Airport Test",
    slug: "airport-test",
    address: "Terminal 2",
    phone: "555-0002",
  });
  otherTenantLocationId = await defaultLocationId(db, await insertTenant(db, "Other Cafe", "other"));
  await db.insert(tenantBusinessHours).values([
    { tenantId, locationId: downtownId, dayOfWeek: 6, opensAt: "08:00", closesAt: "16:00" },
    { tenantId, locationId: airportId, dayOfWeek: 6, opensAt: "05:00", closesAt: "23:00" },
  ]);
  await db.insert(tenantFaqs).values([
    { tenantId, question: "Wi-Fi?", answer: "Ask at the counter." },
    {
      tenantId,
      locationId: airportId,
      question: "Airport test: where do I park at the airport?",
      answer: "Use the short-term lot next to Terminal 1.",
    },
  ]);
  const [coffee] = await db.insert(tenantMenuCategories).values({ tenantId, name: "Coffee" }).returning();
  await insertMenuItem(db, tenantId, { categoryId: coffee.id, name: "Latte", price: "4.75" });
  const login = await insertPersonWithLogin(db, "owner@two-branch.test");
  await insertMember(db, tenantId, login.partyId, "tenant_admin");
  ownerUserId = login.userId;
});

const ReadingSchema = z.object({
  location: z.object({ name: z.string() }).nullish(),
  phone: z.string().nullish(),
  note: z.string().nullish(),
});

const phoneToName = new Map([
  ["555-0001", "Downtown"],
  ["555-0002", "Airport Test"],
]);

const read = (result: ChatBotJson | ChatBotToolError) => {
  const { location, phone, note } = ReadingSchema.parse(result);
  return {
    where: location?.name ?? (phone ? phoneToName.get(phone) : undefined),
    note: note ?? null,
  };
};

const readers: Array<[string, ChatBotToolSpec, Record<string, ChatBotJson>]> = [
  ["listFaqs", listFaqsTool, {}],
  ["listMenu", listMenuTool, {}],
  ["findMenuItems", findMenuItemsTool, { text: "latte", dietaryTag: null }],
  ["getOpeningSchedule", getOpeningScheduleTool, {}],
  ["getBusinessProfile", getBusinessProfileTool, {}],
];

const cases: Array<[string, () => string, string, boolean]> = [
  ["the Location's slug", () => "airport-test", "Airport Test", false],
  ["the Location's name in other case", () => "AIRPORT TEST", "Airport Test", false],
  ["a blank string", () => "  ", "Airport Test", false],
  ["the other Location's id", () => downtownId, "Downtown", false],
  ["the other Location's name", () => "downtown", "Downtown", false],
  ["garbage", () => "the one by the gate", "Airport Test", true],
  ["another Tenant's Location id", () => otherTenantLocationId, "Airport Test", true],
];

describe.each(readers)("%s with a Thread on Airport and a model-supplied locationId", (_, tool, base) => {
  it.each(cases)("%s", async (_case, value, expectedWhere, expectsNote) => {
    const threadId = await newThread(airportId);

    const result = await run(tool, { ...base, locationId: value() }, threadId);

    expect(result).not.toHaveProperty("error");
    const reading = read(result);
    expect(reading.where).toBe(expectedWhere);
    expect(reading.note?.includes("ignored") ?? false).toBe(expectsNote);
    expect(reading.note === null).toBe(!expectsNote);
  });
});

describe("listFaqs with a bad locationId", () => {
  it("still returns the Thread Location's FAQ", async () => {
    const threadId = await newThread(airportId);

    const result = await run(listFaqsTool, { locationId: "airport test, the main one" }, threadId);

    expect(result).toMatchObject({
      location: { id: airportId },
      faqs: expect.arrayContaining([
        expect.objectContaining({ answer: "Use the short-term lot next to Terminal 1." }),
      ]),
    });
  });

  it("keeps the Tenant-wide answer when the Thread has no Location", async () => {
    const threadId = await newThread(null);

    const result = await run(listFaqsTool, { locationId: "nowhere" }, threadId);

    expect(result).toMatchObject({ location: null, faqs: [expect.objectContaining({ question: "Wi-Fi?" })] });
    expect(read(result).note).toContain("ignored");
  });

  it("never uses another Tenant's Location", async () => {
    const threadId = await newThread(null);

    const result = await run(listFaqsTool, { locationId: otherTenantLocationId }, threadId);

    expect(result).toMatchObject({ location: null });
  });
});

describe("getOpeningSchedule with a bad locationId and no Thread Location", () => {
  it("asks which location instead of failing, and says the value was ignored", async () => {
    const threadId = await newThread(null);

    const result = await run(getOpeningScheduleTool, { locationId: "garbage" }, threadId);

    expect(result).toMatchObject({ needsLocation: true });
    expect(result).toHaveProperty("message", expect.stringContaining("ignored"));
  });
});

describe("admin hours tools with a locationId that matches nothing", () => {
  const closed = { date: "2999-12-25", isClosed: true, opensAt: null, closesAt: null, note: null };

  it("write to the named Location by slug", async () => {
    const threadId = await newThread(downtownId, ownerUserId);

    await run(setHoursOverrideTool, { ...closed, locationId: "airport-test" }, threadId, true);

    expect(await run(getOpeningScheduleTool, { locationId: airportId }, threadId, true)).toHaveProperty(
      "specialDates",
      [closed],
    );
    expect(await run(getOpeningScheduleTool, { locationId: downtownId }, threadId, true)).toHaveProperty(
      "specialDates",
      [],
    );
  });

  it.each([
    ["setHoursOverride", setHoursOverrideTool, { ...closed, date: "2999-12-27" }],
    ["setBusinessHours", setBusinessHoursTool, { weekday: "Monday", isClosed: true, opensAt: null, closesAt: null }],
    ["removeHoursOverride", removeHoursOverrideTool, { date: "2999-12-27" }],
  ] as const)("%s asks which location and writes nothing", async (_, tool, input) => {
    const threadId = await newThread(downtownId, ownerUserId);

    const result = await run(tool, { ...input, locationId: otherTenantLocationId }, threadId, true);

    expect(result).toMatchObject({ needsLocation: true, locations: expect.arrayContaining([{ id: airportId, name: "Airport Test" }]) });
    expect(result).toHaveProperty("message", expect.stringContaining("ignored"));
    expect(await run(getOpeningScheduleTool, { locationId: downtownId }, threadId, true)).toHaveProperty(
      "specialDates",
      [],
    );
  });
});
