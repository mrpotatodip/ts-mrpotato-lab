import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { chatBotThreadSessions, chatBotThreads, tenantFaqs, tenantLocations } from "@repo/db-amelie";
import type { ChatBotJson, ChatBotToolError } from "@repo/contracts/chat-bots";
import { FaqResultSchema, FaqScopeNeededResultSchema } from "#/modules/chat-bot/schemas";
import { ListFaqsResultSchema } from "#/modules/chat-bot/agent-tools/public/list-faqs";
import type { DbConnectType } from "#/lib/db-connection";
import { addFaqTool, listFaqsTool, updateFaqTool } from "#/modules/chat-bot/agent-tools";
import type { ChatBotOwner, ChatBotRuntime, ChatBotToolSpec } from "#/modules/chat-bot/types";
import {
  createTestDb,
  defaultLocationId,
  insertCountry,
  insertLocation,
  insertMember,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

// -----
// A café in US (Seattle) and CA (Toronto, Montreal).
// Real-model behaviour (does it pass the scope) is not
// tested here: these check what the tools return and write.
// -----
let db: DbConnectType;
let tenantId: string;
let owner: ChatBotOwner;
let caId: string;
let seattleId: string;
let torontoId: string;
let montrealId: string;
let archivedLocationId: string;
let foreignCountryId: string;
let foreignLocationId: string;

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

const readAs = (tool: ChatBotToolSpec, input: Parameters<ChatBotToolSpec["execute"]>[0], threadId?: string, forTenant = tenantId) => {
  const runtime: ChatBotRuntime = { db, threadId, owner: { kind: "anonymous", tenantId: forTenant, anonymousId: "anon-1" } };
  return Effect.runPromise(tool.execute(input, runtime));
};

const asOwner = (tool: ChatBotToolSpec, input: Parameters<ChatBotToolSpec["execute"]>[0]) =>
  Effect.runPromise(tool.execute(input, { db, owner }));

const questions = (result: ChatBotJson | ChatBotToolError) =>
  ListFaqsResultSchema.parse(result)
    .faqs.map((faq) => faq.question)
    .toSorted();

const faqRows = () => db.select().from(tenantFaqs).where(eq(tenantFaqs.tenantId, tenantId));

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Maple", "maple");
  seattleId = await defaultLocationId(db, tenantId);
  caId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
  await insertCountry(db, tenantId, { country: "JP", currency: "JPY", archivedAt: new Date() });
  torontoId = await insertLocation(db, tenantId, { name: "Toronto", slug: "toronto", countryId: caId });
  montrealId = await insertLocation(db, tenantId, { name: "Montreal", slug: "montreal", countryId: caId });
  archivedLocationId = await insertLocation(db, tenantId, { name: "Old Town", slug: "old-town" });
  await db.update(tenantLocations).set({ archivedAt: new Date() }).where(
    eq(tenantLocations.id, archivedLocationId),
  );
  const otherId = await insertTenant(db, "Other", "other");
  foreignCountryId = await insertCountry(db, otherId, { country: "FR", currency: "EUR" });
  foreignLocationId = await defaultLocationId(db, otherId);
  const login = await insertPersonWithLogin(db, "owner@maple.test");
  await insertMember(db, tenantId, login.partyId, "owner");
  owner = { kind: "user", tenantId, userId: login.userId };
  await db.insert(tenantFaqs).values([
    { tenantId, question: "Do you take cards?", answer: "Yes." },
    { tenantId, countryId: caId, question: "Do you accept Interac?", answer: "Yes." },
    { tenantId, locationId: torontoId, question: "Toronto parking?", answer: "Lot." },
    { tenantId, locationId: seattleId, question: "Seattle parking?", answer: "Street." },
  ]);
});

describe("listFaqs with Countries", () => {
  it("shows café-wide, the Country's and the Location's own FAQs at Toronto", async () => {
    const result = await readAs(listFaqsTool, {}, await newThread({ locationId: torontoId }));

    expect(questions(result)).toEqual(["Do you accept Interac?", "Do you take cards?", "Toronto parking?"]);
  });

  it("never shows a Canadian FAQ at a US Location", async () => {
    const result = await readAs(listFaqsTool, {}, await newThread({ locationId: seattleId }));

    expect(questions(result)).toEqual(["Do you take cards?", "Seattle parking?"]);
  });

  it("uses the Thread's Country when no Location is set", async () => {
    const result = await readAs(listFaqsTool, {}, await newThread({ countryId: caId }));

    expect(questions(result)).toEqual(["Do you accept Interac?", "Do you take cards?"]);
    expect(result).toMatchObject({ location: null, note: expect.any(String) });
  });

  it("returns only café-wide FAQs and a note with several Countries and none in play", async () => {
    const result = await readAs(listFaqsTool, {});

    expect(questions(result)).toEqual(["Do you take cards?"]);
    expect(result).toMatchObject({ location: null, note: expect.stringContaining("every location") });
  });

  it("lets a named Location override the Thread's Country", async () => {
    const result = await readAs(listFaqsTool, { locationId: "maple" }, await newThread({ countryId: caId }));

    expect(questions(result)).toEqual(["Do you take cards?", "Seattle parking?"]);
  });
});

describe("addFaq and updateFaq scope", () => {
  const add = (scope?: string | null) => asOwner(addFaqTool, { categoryId: null, question: `Q ${scope}?`, answer: "A.", scope });

  it("saves an FAQ for Canada scoped to Canada, by name or code", async () => {
    expect(await add("Canada")).toMatchObject({ countryId: caId, locationId: null });
    expect(await add("ca")).toMatchObject({ countryId: caId, locationId: null });
  });

  it("saves an FAQ for one Location by name", async () => {
    expect(await add("Toronto")).toMatchObject({ locationId: torontoId, countryId: null });
  });

  it("defaults to all Locations", async () => {
    expect(await add()).toMatchObject({ locationId: null, countryId: null });
    expect(await add("all")).toMatchObject({ locationId: null, countryId: null });
  });

  it("changes nothing for a bad scope and returns the valid choices", async () => {
    const before = (await faqRows()).length;
    const bad = [
      "Atlantis",
      "JP",
      "Old Town",
      archivedLocationId,
      foreignCountryId,
      foreignLocationId,
    ];

    for (const scope of bad) {
      const result = await add(scope);
      expect(result).toMatchObject({
        needsScope: true,
        countries: expect.arrayContaining([expect.objectContaining({ code: "CA" })]),
        locations: expect.arrayContaining([expect.objectContaining({ name: "Toronto" })]),
      });
      expect(JSON.stringify(FaqScopeNeededResultSchema.parse(result).locations)).not.toContain("Old Town");
    }
    expect((await faqRows()).length).toBe(before);
  });

  it("moves an FAQ to a Country, a Location and back to all with updateFaq", async () => {
    const created = FaqResultSchema.parse(await add("all"));
    const move = (scope: string | null) => asOwner(updateFaqTool, { faqId: created.id, question: null, answer: null, scope });

    expect(await move("Canada")).toMatchObject({ countryId: caId, locationId: null });
    expect(await move("Montreal")).toMatchObject({ locationId: montrealId, countryId: null });
    expect(await move("all")).toMatchObject({ locationId: null, countryId: null });
  });

  it("leaves the scope alone when updateFaq passes no scope, and refuses a bad one", async () => {
    const created = FaqResultSchema.parse(await add("Canada"));

    expect(
      await asOwner(updateFaqTool, { faqId: created.id, question: null, answer: "New.", scope: null }),
    ).toMatchObject({ countryId: caId, answer: "New." });
    expect(
      await asOwner(updateFaqTool, { faqId: created.id, question: null, answer: "Newer.", scope: "Atlantis" }),
    ).toMatchObject({ needsScope: true });
    expect((await faqRows()).find((row) => row.id === created.id)).toMatchObject({ answer: "New.", countryId: caId });
  });
});
