import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import {
  chatBotThreadSessions,
  chatBotThreads,
  tenantFaqs,
  tenantMenuCategories,
  tenantMenuItemLocations,
} from "@repo/db-amelie";
import type { ChatBotJson, ChatBotToolError } from "@repo/contracts/chat-bots";
import type { DbConnectType } from "#/lib/db-connection";
import {
  ListFaqsResultSchema,
  ListMenuResultSchema,
  findMenuItemsTool,
  listFaqsTool,
  listMenuTool,
} from "#/modules/chat-bot/agent-tools";
import type { ChatBotRuntime, ChatBotToolSpec } from "#/modules/chat-bot/types";
import { createTestDb, defaultLocationId, insertLocation, insertMenuItems, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let soloTenantId: string;
let soloLocationId: string;
let downtownId: string;
let airportId: string;
let otherTenantLocationId: string;

const newThread = async (forTenant: string, locationId: string | null) => {
  const [thread] = await db.insert(chatBotThreads).values({}).returning({ id: chatBotThreads.id });
  await db.insert(chatBotThreadSessions).values({
    threadId: thread.id,
    tenantId: forTenant,
    locationId,
    anonymousId: "anon-1",
    expiresAt: new Date("2999-01-01"),
  });
  return thread.id;
};

const run = (
  tool: ChatBotToolSpec,
  input: Parameters<ChatBotToolSpec["execute"]>[0],
  { threadId, forTenant = tenantId }: { threadId?: string; forTenant?: string } = {},
) => {
  const runtime: ChatBotRuntime = {
    db,
    threadId,
    owner: { kind: "anonymous", tenantId: forTenant, anonymousId: "anon-1" },
  };
  return Effect.runPromise(tool.execute(input, runtime));
};

const menuNames = (result: ChatBotJson | ChatBotToolError) =>
  ListMenuResultSchema.parse(result)
    .categories.flatMap((category) => category.items.map((item) => item.name))
    .toSorted();

const faqQuestions = (result: ChatBotJson | ChatBotToolError) =>
  ListFaqsResultSchema.parse(result)
    .faqs.map((faq) => faq.question)
    .toSorted();

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Two Branch Cafe", "two-branch");
  downtownId = await defaultLocationId(db, tenantId);
  airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
  soloTenantId = await insertTenant(db, "Solo Cafe", "solo");
  soloLocationId = await defaultLocationId(db, soloTenantId);
  otherTenantLocationId = soloLocationId;

  const [category] = await db.insert(tenantMenuCategories).values({ tenantId, name: "Menu" }).returning();
  const [icedLatte, sandwich] = await insertMenuItems(db, tenantId, [
      { categoryId: category.id, name: "Iced Latte", price: "5" },
      { categoryId: category.id, name: "Airport Sandwich", price: "8", availableAtAllLocations: false },
      { categoryId: category.id, name: "Croissant", price: "3" },
    ]);
  await db.insert(tenantMenuItemLocations).values([
    { tenantId, menuItemId: icedLatte.id, locationId: downtownId, isAvailable: false },
    { tenantId, menuItemId: sandwich.id, locationId: airportId, isAvailable: true },
  ]);
  await db.insert(tenantFaqs).values([
    { tenantId, question: "Do you take cards?", answer: "Yes." },
    { tenantId, locationId: airportId, question: "Where is the Airport counter?", answer: "Gate 4." },
  ]);

  const [soloCategory] = await db
    .insert(tenantMenuCategories)
    .values({ tenantId: soloTenantId, name: "Menu" })
    .returning();
  const [soloOnly] = await insertMenuItems(db, soloTenantId, [
      { categoryId: soloCategory.id, name: "Solo Special", price: "6", availableAtAllLocations: false },
      { categoryId: soloCategory.id, name: "Solo Soda", price: "2" },
    ]);
  await db
    .insert(tenantMenuItemLocations)
    .values({ tenantId: soloTenantId, menuItemId: soloOnly.id, locationId: soloLocationId, isAvailable: true });
});

describe("listMenu and findMenuItems follow the Thread's Location", () => {
  it("hides Iced Latte at Downtown but shows it at Airport", async () => {
    const downtown = await run(listMenuTool, {}, { threadId: await newThread(tenantId, downtownId) });
    const airport = await run(listMenuTool, {}, { threadId: await newThread(tenantId, airportId) });

    expect(menuNames(downtown)).toEqual(["Croissant"]);
    expect(menuNames(airport)).toEqual(["Airport Sandwich", "Croissant", "Iced Latte"]);
    expect(downtown).toMatchObject({ location: { id: downtownId, name: "Two Branch Cafe" }, note: null });
  });

  it("applies the same rule to findMenuItems", async () => {
    const threadId = await newThread(tenantId, downtownId);

    expect(await run(findMenuItemsTool, { text: "latte", dietaryTag: null }, { threadId })).toMatchObject({ items: [] });
    expect(await run(findMenuItemsTool, { text: "sandwich", dietaryTag: null }, { threadId })).toMatchObject({ items: [] });
    expect(
      await run(findMenuItemsTool, { text: "latte", dietaryTag: null }, { threadId: await newThread(tenantId, airportId) }),
    ).toMatchObject({ items: [{ name: "Iced Latte" }] });
  });

  it("lets the model's locationId override the Thread's", async () => {
    const threadId = await newThread(tenantId, downtownId);

    expect(menuNames(await run(listMenuTool, { locationId: airportId }, { threadId }))).toContain("Iced Latte");
  });

  it("ignores another Tenant's Location and says so", async () => {
    const note = expect.stringContaining("ignored");

    expect(await run(listMenuTool, { locationId: otherTenantLocationId })).toMatchObject({ location: null, note });
    expect(await run(listFaqsTool, { locationId: otherTenantLocationId })).toMatchObject({ location: null, note });
  });

  it("uses a single-Location Tenant's only Location silently", async () => {
    const result = await run(listMenuTool, {}, { forTenant: soloTenantId });

    expect(menuNames(result)).toEqual(["Solo Soda", "Solo Special"]);
    expect(result).toMatchObject({ location: { id: soloLocationId }, note: null });
  });

  it("still answers Tenant-wide, without hiding items, when no Location is set on a multi-Location Tenant", async () => {
    const withoutThread = await run(listMenuTool, {});
    const withNoLocationThread = await run(listMenuTool, {}, { threadId: await newThread(tenantId, null) });
    const found = await run(findMenuItemsTool, { text: "latte", dietaryTag: null });

    expect(menuNames(withoutThread)).toEqual(["Airport Sandwich", "Croissant", "Iced Latte"]);
    expect(menuNames(withNoLocationThread)).toEqual(menuNames(withoutThread));
    expect(withoutThread).toMatchObject({ location: null, note: expect.stringContaining("every location") });
    expect(found).toMatchObject({ items: [{ name: "Iced Latte" }], location: null, note: expect.any(String) });
  });
});

describe("listFaqs follows the Thread's Location", () => {
  it("returns Tenant-wide FAQs plus the Location's own", async () => {
    const airport = await run(listFaqsTool, {}, { threadId: await newThread(tenantId, airportId) });
    const downtown = await run(listFaqsTool, {}, { threadId: await newThread(tenantId, downtownId) });

    expect(faqQuestions(airport)).toEqual(["Do you take cards?", "Where is the Airport counter?"]);
    expect(faqQuestions(downtown)).toEqual(["Do you take cards?"]);
  });

  it("returns only Tenant-wide FAQs, with a note, when no Location is set", async () => {
    const result = await run(listFaqsTool, {});

    expect(faqQuestions(result)).toEqual(["Do you take cards?"]);
    expect(result).toMatchObject({ location: null, note: expect.any(String) });
  });
});
