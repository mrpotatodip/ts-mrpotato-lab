import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import type { ChatBotJson, ChatBotToolError } from "@repo/contracts/chat-bots";
import {
  chatBotThreadSessions,
  chatBotThreads,
  tenantBusinessHours,
  tenantCountries,
  tenantMenuCategories,
} from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import {
  findMenuItemsTool,
  getBusinessProfileTool,
  getOpeningScheduleTool,
  listMenuTool,
  setThreadCountryTool,
  setThreadLocationTool,
  showMenuItemsTool,
} from "#/modules/chat-bot/agent-tools";
import { mcpToolSpecs } from "#/modules/mcp/api/handle-mcp";
import type { ChatBotRuntime, ChatBotToolSpec } from "#/modules/chat-bot/types";
import {
  createTestDb,
  defaultLocationId,
  insertCountry,
  insertLocation,
  insertMenuItem,
  insertMenuItemPrice,
  insertTenant,
} from "#/__tests__/amelie-test-db";

// -----
// A café in three Countries. US: Seattle. CA: Toronto
// (its only Canadian Location). MX: Tulum and Cancun.
// The latte sells everywhere, the poutine only in CA.
// Real-model behaviour is not tested here: these check
// what the tools return and store.
// -----
let db: DbConnectType;
let tenantId: string;
let usId: string;
let caId: string;
let mxId: string;
let archivedId: string;
let foreignCountryId: string;
let seattleId: string;
let torontoId: string;
let tulumId: string;
let latteId: string;
let poutineId: string;

const newThread = async (init: { countryId?: string | null; locationId?: string | null } = {}) => {
  const [thread] = await db.insert(chatBotThreads).values({}).returning({ id: chatBotThreads.id });
  await db.insert(chatBotThreadSessions).values({
    threadId: thread.id,
    tenantId,
    locationId: init.locationId ?? null,
    countryId: init.countryId ?? null,
    anonymousId: "anon-1",
    expiresAt: new Date("2999-01-01"),
  });
  return thread.id;
};

const threadRow = async (threadId: string) => {
  const [row] = await db
    .select({ countryId: chatBotThreadSessions.countryId, locationId: chatBotThreadSessions.locationId })
    .from(chatBotThreadSessions)
    .where(eq(chatBotThreadSessions.threadId, threadId));
  return row;
};

const run = (tool: ChatBotToolSpec, input: Parameters<ChatBotToolSpec["execute"]>[0], threadId?: string) => {
  const runtime: ChatBotRuntime = { db, threadId, owner: { kind: "anonymous", tenantId, anonymousId: "anon-1" } };
  return Effect.runPromise(tool.execute(input, runtime));
};

// SAFETY: the tools return plain JSON objects; each test names the shape it reads.
const out = <T,>(value: ChatBotJson | ChatBotToolError): T => value as T;

type MenuResult = {
  location: { id: string; name: string } | null;
  country: { code: string; currency: string } | null;
  note: string | null;
  categories?: Array<{ items: Array<{ name: string; price: string | null; currency: string | null }> }>;
  items?: Array<{ name: string; price: string | null; currency: string | null }>;
};

const listed = async (input: ChatBotJson, threadId?: string) => {
  const result = out<MenuResult>(await run(listMenuTool, input, threadId));
  return { ...result, flat: (result.categories ?? []).flatMap((category) => category.items) };
};

const priced = (items: Array<{ name: string; price: string | null; currency: string | null }>) =>
  items.map(({ name, price, currency }) => `${name} ${price ?? "-"} ${currency ?? "-"}`);

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Maple Cafe", "maple");
  const [us] = await db.select({ id: tenantCountries.id }).from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId));
  usId = us.id;
  seattleId = await defaultLocationId(db, tenantId);
  caId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
  mxId = await insertCountry(db, tenantId, { country: "MX", currency: "MXN" });
  archivedId = await insertCountry(db, tenantId, { country: "JP", currency: "JPY", archivedAt: new Date() });
  foreignCountryId = await insertCountry(db, await insertTenant(db, "Other Cafe", "other"), { country: "FR", currency: "EUR" });
  torontoId = await insertLocation(db, tenantId, { name: "Toronto", slug: "toronto", countryId: caId, timezone: "America/Toronto" });
  tulumId = await insertLocation(db, tenantId, { name: "Tulum", slug: "tulum", countryId: mxId });
  await insertLocation(db, tenantId, { name: "Cancun", slug: "cancun", countryId: mxId });
  await db.insert(tenantBusinessHours).values([
    { tenantId, locationId: seattleId, dayOfWeek: 6, opensAt: "08:00", closesAt: "16:00" },
    { tenantId, locationId: torontoId, dayOfWeek: 6, opensAt: "07:00", closesAt: "21:00" },
  ]);
  const [category] = await db.insert(tenantMenuCategories).values({ tenantId, name: "Drinks" }).returning();
  latteId = (await insertMenuItem(db, tenantId, { categoryId: category.id, name: "Latte", price: "4.00" })).id;
  await insertMenuItemPrice(db, tenantId, latteId, caId, { price: "5.50" });
  await insertMenuItemPrice(db, tenantId, latteId, mxId, { price: "80.00" });
  poutineId = (await insertMenuItem(db, tenantId, { categoryId: category.id, name: "Poutine", price: "9.00", countryId: caId })).id;
});

afterEach(() => vi.restoreAllMocks());

describe("a Thread's Country prices menu answers without a branch", () => {
  it("quotes Canadian prices for a Thread opened for Canada", async () => {
    const threadId = await newThread({ countryId: caId });

    const menu = await listed({}, threadId);

    expect(priced(menu.flat)).toEqual(["Latte 5.50 CAD", "Poutine 9.00 CAD"]);
    expect(menu.country).toMatchObject({ code: "CA", currency: "CAD" });
    expect(menu.location).toBeNull();
    expect(menu.note ?? "").not.toMatch(/which location before/i);
  });

  it("find and cards use the Thread's Country too", async () => {
    const threadId = await newThread({ countryId: mxId });

    const found = out<MenuResult>(await run(findMenuItemsTool, { text: "latte", dietaryTag: null }, threadId));
    const cards = out<MenuResult>(await run(showMenuItemsTool, { ids: [latteId, poutineId] }, threadId));

    expect(priced(found.items ?? [])).toEqual(["Latte 80.00 MXN"]);
    expect(priced(cards.items ?? [])).toEqual(["Latte 80.00 MXN"]);
  });

  it("falls back to the Thread's Location's Country", async () => {
    const threadId = await newThread({ locationId: torontoId });

    expect(priced((await listed({}, threadId)).flat)).toEqual(["Latte 5.50 CAD", "Poutine 9.00 CAD"]);
  });

  it("uses the Thread's Country before its Location's", async () => {
    const threadId = await newThread({ locationId: torontoId, countryId: usId });

    const menu = await listed({}, threadId);

    expect(priced(menu.flat)).toEqual(["Latte 4.00 USD"]);
    expect(menu.location).toBeNull();
  });

  it("treats an archived Thread Country as none", async () => {
    const threadId = await newThread();
    await db.update(tenantCountries).set({ archivedAt: new Date() }).where(eq(tenantCountries.id, mxId));
    await db.update(chatBotThreadSessions).set({ countryId: mxId }).where(eq(chatBotThreadSessions.threadId, threadId));

    const menu = await listed({}, threadId);
    await db.update(tenantCountries).set({ archivedAt: null }).where(eq(tenantCountries.id, mxId));

    expect(menu.flat.every((item) => item.price === null)).toBe(true);
  });
});

describe("several Countries and none in play: names and availability, no prices", () => {
  it("lists the menu without prices and says to ask which location", async () => {
    const menu = await listed({}, await newThread());

    expect(priced(menu.flat)).toEqual(["Latte - -", "Poutine - -"]);
    expect(menu.country).toBeNull();
    expect(menu.note).toMatch(/ask which location/i);
    expect(menu.note).toMatch(/before (quoting|giving) a price/i);
  });

  it("'Do you have lattes?' still finds the latte", async () => {
    const found = out<MenuResult>(await run(findMenuItemsTool, { text: "latte", dietaryTag: null }, await newThread()));

    expect(priced(found.items ?? [])).toEqual(["Latte - -"]);
    expect(found.note).toMatch(/ask which location/i);
  });

  it("cards carry names and no price", async () => {
    const cards = out<MenuResult>(await run(showMenuItemsTool, { ids: [latteId] }, await newThread()));

    expect(priced(cards.items ?? [])).toEqual(["Latte - -"]);
  });

  it("applies to MCP callers (no Thread) and a countryId gives them prices", async () => {
    const [mcpListMenu] = mcpToolSpecs.filter((spec) => spec.definition.name === "listMenu");

    const bare = out<MenuResult>(await run(mcpListMenu, {}));
    const withCountry = out<MenuResult>(await run(mcpListMenu, { countryId: "CA" }));
    const withLocation = out<MenuResult>(await run(mcpListMenu, { locationId: "tulum" }));

    expect(bare.categories?.flatMap((c) => c.items).every((item) => item.price === null)).toBe(true);
    expect(bare.note).toMatch(/ask which location/i);
    expect(priced(withCountry.categories?.flatMap((c) => c.items) ?? [])).toEqual(["Latte 5.50 CAD", "Poutine 9.00 CAD"]);
    expect(priced(withLocation.categories?.flatMap((c) => c.items) ?? [])).toEqual(["Latte 80.00 MXN"]);
  });

  it("lists countryId in the MCP tools' input schemas", () => {
    for (const name of ["listMenu", "findMenuItems"]) {
      const spec = mcpToolSpecs.find((tool) => tool.definition.name === name);
      expect(JSON.stringify(spec?.definition.inputSchema)).toContain("countryId");
    }
  });
});

describe("the model's countryId override", () => {
  it("takes a code, a name or an id, any case", async () => {
    for (const countryId of ["CA", "ca", "Canada", " canada ", caId]) {
      expect(priced((await listed({ countryId }, await newThread())).flat)).toEqual(["Latte 5.50 CAD", "Poutine 9.00 CAD"]);
    }
  });

  it("beats the Thread's Country", async () => {
    const threadId = await newThread({ countryId: mxId });

    expect(priced((await listed({ countryId: "US" }, threadId)).flat)).toEqual(["Latte 4.00 USD"]);
  });

  it("beats the Thread's Location, which is then left out of the answer", async () => {
    const threadId = await newThread({ locationId: torontoId });

    const menu = await listed({ countryId: "United States" }, threadId);

    expect(priced(menu.flat)).toEqual(["Latte 4.00 USD"]);
    expect(menu.location).toBeNull();
  });

  it("keeps a Location that is in that Country", async () => {
    const menu = await listed({ countryId: "CA" }, await newThread({ locationId: torontoId }));

    expect(menu.location).toEqual({ id: torontoId, name: "Toronto" });
    expect(priced(menu.flat)).toEqual(["Latte 5.50 CAD", "Poutine 9.00 CAD"]);
  });

  it("never errors on a made-up, archived or another café's country: ignored with a note", async () => {
    for (const countryId of ["Atlantis", "JP", archivedId, "FR", foreignCountryId]) {
      const menu = await listed({ countryId }, await newThread({ countryId: caId }));

      expect(priced(menu.flat)).toEqual(["Latte 5.50 CAD", "Poutine 9.00 CAD"]);
      expect(menu.note).toContain("countryId");
      expect(menu.note).toContain("Canada");
      expect(menu.note).not.toContain("France");
    }
    const found = out<MenuResult>(await run(findMenuItemsTool, { text: "latte", dietaryTag: null, countryId: "Atlantis" }, await newThread()));
    expect(found.items).toHaveLength(1);
    expect(found.note).toContain("countryId");
  });
});

describe("setThreadLocation keeps the Thread's Country in step", () => {
  it("a Thread set to Canada, then to a US Location, quotes US prices and keeps the Location", async () => {
    const threadId = await newThread();
    await run(setThreadCountryTool, { country: "CA" }, threadId);

    await run(setThreadLocationTool, { location: seattleId }, threadId);

    expect(await threadRow(threadId)).toEqual({ countryId: usId, locationId: seattleId });
    const menu = await listed({}, threadId);
    expect(priced(menu.flat)).toEqual(["Latte 4.00 USD"]);
    expect(menu.location).toMatchObject({ id: seattleId });
  });
});

describe("setThreadCountry", () => {
  it("sets the Thread's Country from a name, code or id, any case", async () => {
    for (const country of ["Canada", "ca", " CANADA ", caId]) {
      const threadId = await newThread();

      expect(await run(setThreadCountryTool, { country }, threadId)).toEqual({
        country: { id: caId, name: "Canada", code: "CA" },
      });
      expect((await threadRow(threadId)).countryId).toBe(caId);
    }
  });

  it("switches on a later call", async () => {
    const threadId = await newThread({ countryId: caId });

    await run(setThreadCountryTool, { country: "Mexico" }, threadId);

    expect((await threadRow(threadId)).countryId).toBe(mxId);
    expect(priced((await listed({}, threadId)).flat)).toEqual(["Latte 80.00 MXN"]);
  });

  it("clears the Thread's Location when it is in another Country", async () => {
    const threadId = await newThread({ locationId: torontoId });

    await run(setThreadCountryTool, { country: "US" }, threadId);
    expect(await threadRow(threadId)).toEqual({ countryId: usId, locationId: null });

    const sameCountry = await newThread({ locationId: torontoId });
    await run(setThreadCountryTool, { country: "CA" }, sameCountry);
    expect(await threadRow(sameCountry)).toEqual({ countryId: caId, locationId: torontoId });
  });

  it("rejects archived, foreign and made-up Countries with the valid options, changing nothing, and logs it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const country of [archivedId, "JP", foreignCountryId, "FR", "Atlantis"]) {
      const threadId = await newThread({ countryId: usId });

      const result = out<{ error: string }>(await run(setThreadCountryTool, { country }, threadId));

      expect(result.error).toContain("Canada");
      expect(result.error).toContain("Mexico");
      expect(result.error).not.toContain("France");
      expect(result.error).not.toContain("Japan");
      expect((await threadRow(threadId)).countryId).toBe(usId);
    }
    expect(log).toHaveBeenCalledWith("chat-bot: tool call rejected", expect.objectContaining({ tool: "setThreadCountry" }));
  });

  it("needs a Thread", async () => {
    const result = out<{ error: string }>(await run(setThreadCountryTool, { country: "CA" }));

    expect(result.error).toMatch(/thread/i);
  });
});

describe("a Country with one open Location resolves it for hours and profile", () => {
  it("'I'm in Canada, what time do you close?' answers with Toronto's hours", async () => {
    const threadId = await newThread();
    await run(setThreadCountryTool, { country: "Canada" }, threadId);

    const schedule = out<{ location: { name: string }; weekly: Array<{ weekday: string; closesAt: string | null }> }>(await run(getOpeningScheduleTool, {}, threadId));

    expect(schedule.location.name).toBe("Toronto");
    expect(schedule.weekly.find((day) => day.closesAt === "21:00")).toBeDefined();
  });

  it("profile: gives Toronto's address and phone without asking", async () => {
    const profile = out<{ needsLocation?: true }>(await run(getBusinessProfileTool, {}, await newThread({ countryId: caId })));

    expect(profile).not.toHaveProperty("needsLocation");
  });

  it("with several Locations asks which branch, offering only that Country's", async () => {
    const threadId = await newThread({ countryId: mxId });

    const schedule = out<{ needsLocation: true; locations: Array<{ name: string }> }>(await run(getOpeningScheduleTool, {}, threadId));
    const profile = out<{
      needsLocation: true;
      locations: Array<{ name: string }>;
      country: { code: string } | null;
      location: { name: string } | null;
    }>(await run(getBusinessProfileTool, {}, threadId));

    expect(schedule.needsLocation).toBe(true);
    expect(schedule.locations.map((location) => location.name)).toEqual(["Tulum", "Cancun"]);
    expect(profile.locations.map((location) => location.name)).toEqual(["Tulum", "Cancun"]);
    expect(profile.location).toBeNull();
    expect(profile.country?.code).toBe("MX");
  });

  it("never asks for a branch for prices, even when the Country has several", async () => {
    const menu = await listed({}, await newThread({ countryId: mxId }));

    expect(priced(menu.flat)).toEqual(["Latte 80.00 MXN"]);
    expect(JSON.stringify(menu)).not.toContain("needsLocation");
  });

  it("an explicit locationId still wins over the Country", async () => {
    const schedule = out<{ location: { id: string } }>(await run(getOpeningScheduleTool, { locationId: seattleId }, await newThread({ countryId: caId })));

    expect(schedule.location.id).toBe(seattleId);
  });

  it("keeps tulum out of the way: a Thread Location beats the Country's lone Location", async () => {
    const schedule = out<{ location: { id: string } }>(await run(getOpeningScheduleTool, {}, await newThread({ countryId: mxId, locationId: tulumId })));

    expect(schedule.location.id).toBe(tulumId);
  });
});

describe("a Location whose Country has no priced menu", () => {
  let wellingtonId: string;

  beforeAll(async () => {
    const nzId = await insertCountry(db, tenantId, { country: "NZ", currency: "NZD" });
    wellingtonId = await insertLocation(db, tenantId, {
      name: "Wellington",
      slug: "wellington",
      countryId: nzId,
      timezone: "Pacific/Auckland",
    });
  });

  it("still names cafe-wide matches and does not pretend they are sold there", async () => {
    const threadId = await newThread({ locationId: wellingtonId });
    const found = out<MenuResult>(await run(findMenuItemsTool, { text: "latte", dietaryTag: null }, threadId));

    expect(found.items?.map((item) => item.name)).toContain("Latte");
    expect(found.items?.every((item) => item.price === null)).toBe(true);
    expect(found.note).toMatch(/not sold at this location/i);
    expect(found.location?.name).toBe("Wellington");
  });

  it("does not invent a miss when one item is absent but the Location still sells others", async () => {
    const found = out<MenuResult>(
      await run(findMenuItemsTool, { text: "poutine", dietaryTag: null }, await newThread({ locationId: seattleId })),
    );

    expect(found.items).toEqual([]);
    expect(found.note ?? "").not.toMatch(/not sold at this location/i);
  });
});
