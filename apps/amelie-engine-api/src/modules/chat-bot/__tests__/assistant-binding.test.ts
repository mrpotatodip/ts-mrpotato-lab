import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { partyRoles, partyRoleScopes } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import {
  getOpeningScheduleTool,
  removeHoursOverrideTool,
  setBusinessHoursTool,
  setHoursOverrideTool,
} from "#/modules/chat-bot/agent-tools";
import { CHAT_BOT_EDITOR_ONLY } from "#/modules/chat-bot/constants";
import { LocationNeededResultSchema } from "#/modules/chat-bot/schemas";
import type { ChatBotOwner, ChatBotRuntime, ChatBotToolSpec } from "#/modules/chat-bot/types";
import { TENANT_LOCATION_NOT_COVERED } from "#/modules/tenant/constants";
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
let harbourId: string;
let admin: ChatBotOwner;
let single: ChatBotOwner;
let double: ChatBotOwner;
let unbound: ChatBotOwner;
let staff: ChatBotOwner;

const run = (tool: ChatBotToolSpec, input: Parameters<ChatBotToolSpec["execute"]>[0], who: ChatBotOwner) => {
  const runtime: ChatBotRuntime = { db, owner: who };
  return Effect.runPromise(tool.execute(input, runtime));
};

const hours = { weekday: "Monday", isClosed: false, opensAt: "08:00", closesAt: "16:00" };
const override = { date: "2999-12-25", isClosed: true, opensAt: null, closesAt: null, note: null };

const member = async (email: string, role: string, bindings: string[] = []): Promise<ChatBotOwner> => {
  const login = await insertPersonWithLogin(db, email);
  await insertMember(db, tenantId, login.partyId, role);
  const [partyRole] = await db.select({ id: partyRoles.id }).from(partyRoles).where(eq(partyRoles.partyId, login.partyId));
  for (const locationId of bindings) {
    await db.insert(partyRoleScopes).values({ tenantId, partyRoleId: partyRole.id, locationId });
  }
  return { kind: "user", tenantId, userId: login.userId };
};

const optionNames = (result: Awaited<ReturnType<typeof run>>): string[] => {
  const parsed = LocationNeededResultSchema.safeParse(result);
  return parsed.success ? parsed.data.locations.map((option) => option.name).toSorted() : [];
};

const scheduleAt =(locationId: string) => run(getOpeningScheduleTool, { locationId }, admin);

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Sorella", "sorella");
  downtownId = await defaultLocationId(db, tenantId);
  airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
  harbourId = await insertLocation(db, tenantId, { name: "Harbour", slug: "harbour" });
  admin = await member("admin@b.test", "tenant_admin");
  single = await member("single@b.test", "store_admin", [airportId]);
  double = await member("double@b.test", "store_admin", [airportId, harbourId]);
  unbound = await member("unbound@b.test", "store_admin");
  staff = await member("staff@b.test", "store_staff", [airportId]);
});

describe("a member bound to one Location", () => {
  it("is refused at an uncovered Location by every hours tool, and nothing is written", async () => {
    const results = [
      await run(setBusinessHoursTool, { ...hours, locationId: downtownId }, single),
      await run(setHoursOverrideTool, { ...override, locationId: downtownId }, single),
      await run(removeHoursOverrideTool, { date: override.date, locationId: downtownId }, single),
    ];
    expect(results.map((result) => result)).toEqual(results.map(() => ({ error: TENANT_LOCATION_NOT_COVERED })));
    expect(await scheduleAt(downtownId)).toHaveProperty("weekly.1.isSet", false);
  });

  it("succeeds at the covered Location", async () => {
    expect(await run(setBusinessHoursTool, { ...hours, locationId: "Airport" }, single)).toEqual({ ...hours, isSet: true });
    expect(await scheduleAt(airportId)).toHaveProperty("weekly.1.isSet", true);
  });

  it("can omit the Location: the covered one is used", async () => {
    expect(await run(setBusinessHoursTool, { ...hours, weekday: "Tuesday" }, single)).toHaveProperty("isSet", true);
    expect(await scheduleAt(airportId)).toHaveProperty("weekly.2.isSet", true);
    expect(await scheduleAt(downtownId)).toHaveProperty("weekly.2.isSet", false);
  });
});

describe("a member bound to two Locations", () => {
  it("gets needs-location listing only the covered ones", async () => {
    const result = await run(setBusinessHoursTool, hours, double);
    expect(result).toMatchObject({ needsLocation: true, message: expect.not.stringContaining("Sorella") });
    expect(optionNames(result)).toEqual(["Airport", "Harbour"]);
  });

  it("offers only covered Locations when the named one matches nothing", async () => {
    const result = await run(setHoursOverrideTool, { ...override, locationId: "Nowhere" }, double);
    expect(optionNames(result)).toEqual(["Airport", "Harbour"]);
  });

  it("works at a covered Location", async () => {
    expect(await run(setHoursOverrideTool, { ...override, locationId: "Harbour" }, double)).toEqual(override);
  });
});

describe("members the binding does not limit", () => {
  it("lets an unbound member and the tenant admin write anywhere", async () => {
    expect(await run(setBusinessHoursTool, { ...hours, locationId: downtownId }, unbound)).toHaveProperty("isSet", true);
    expect(await run(setBusinessHoursTool, { ...hours, locationId: "Harbour" }, admin)).toHaveProperty("isSet", true);
  });

  it("still asks an unbound member which of all the Locations", async () => {
    const result = await run(setBusinessHoursTool, hours, unbound);
    expect(optionNames(result)).toEqual(["Airport", "Harbour", "Sorella"]);
  });
});

describe("a non-editor", () => {
  it("is still refused, bound or not", async () => {
    expect(await run(setBusinessHoursTool, { ...hours, locationId: "Airport" }, staff)).toEqual({
      error: CHAT_BOT_EDITOR_ONLY,
    });
  });
});
