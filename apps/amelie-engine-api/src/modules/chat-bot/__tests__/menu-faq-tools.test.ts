import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { FindMenuItemsResultSchema } from "@repo/contracts/chat-bots";
import { tenantFaqs, tenantMenuCategories } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import {
  addFaqTool,
  addMenuCategoryTool,
  findMenuItemsTool,
  getBusinessProfileTool,
  listFaqsTool,
  listMenuTool,
  setMenuItemAvailabilityTool,
  setMenuItemsAvailabilityTool,
  showMenuItemsTool,
  updateBusinessProfileTool,
  updateFaqTool,
  updateMenuItemPriceTool,
} from "#/modules/chat-bot/agent-tools";
import { CHAT_BOT_EDITOR_ONLY, CHAT_BOT_TOOL_ERROR_INVALID_INPUT } from "#/modules/chat-bot/constants";
import type { ChatBotOwner, ChatBotToolSpec } from "#/modules/chat-bot/types";
import { createTestDb, insertMember, insertMenuItems, insertPersonWithLogin, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let latteId: string;
let muffinId: string;
let otherItemId: string;
let faqId: string;
let owner: ChatBotOwner;
let member: ChatBotOwner;
let customer: ChatBotOwner;

const run = (tool: ChatBotToolSpec, input: Parameters<ChatBotToolSpec["execute"]>[0], who: ChatBotOwner) =>
  Effect.runPromise(tool.execute(input, { db, owner: who }));

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella");
  const otherCafeId = await insertTenant(db, "Other Cafe", "other-cafe");
  const [coffee] = await db.insert(tenantMenuCategories).values({ tenantId: sorellaId, name: "Coffee" }).returning();
  const [latte, muffin] = await insertMenuItems(db, sorellaId, [
    { categoryId: coffee.id, name: "Latte", price: "4.75" },
    { categoryId: coffee.id, name: "Muffin", price: "4.00" },
  ]);
  latteId = latte.id;
  muffinId = muffin.id;
  const [mains] = await db.insert(tenantMenuCategories).values({ tenantId: otherCafeId, name: "Mains" }).returning();
  const [burger] = await insertMenuItems(db, otherCafeId, [{ categoryId: mains.id, name: "Secret Burger", price: "20" }]);
  otherItemId = burger.id;
  const [faq] = await db
    .insert(tenantFaqs)
    .values({ tenantId: sorellaId, question: "Dogs?", answer: "On the patio." })
    .returning();
  faqId = faq.id;

  const ownerLogin = await insertPersonWithLogin(db, "owner@sorella.test");
  const memberLogin = await insertPersonWithLogin(db, "member@sorella.test");
  await insertMember(db, sorellaId, ownerLogin.partyId, "owner");
  await insertMember(db, sorellaId, memberLogin.partyId, "staff");
  owner = { kind: "user", tenantId: sorellaId, userId: ownerLogin.userId };
  member = { kind: "user", tenantId: sorellaId, userId: memberLogin.userId };
  customer = { kind: "anonymous", tenantId: sorellaId, anonymousId: "a-1" };
});

describe("public menu and FAQ tools", () => {
  it("read the Customer's Tenant only", async () => {
    expect(await run(listMenuTool, {}, customer)).toHaveProperty("categories.0.items.0.name", "Latte");
    expect(await run(findMenuItemsTool, { text: "burger", dietaryTag: null }, customer)).toMatchObject({ items: [] });
    expect(await run(showMenuItemsTool, { ids: [latteId, otherItemId, "made-up"] }, customer)).toHaveProperty(
      "items",
      [expect.objectContaining({ id: latteId, name: "Latte" })],
    );
    expect(await run(listFaqsTool, {}, customer)).toHaveProperty("faqs.0.question", "Dogs?");
    expect(await run(getBusinessProfileTool, {}, customer)).toMatchObject({ phone: null });
  });

  it("rejects a search with nothing to search for", async () => {
    expect(await run(findMenuItemsTool, { text: null, dietaryTag: null }, customer)).toEqual({
      error: CHAT_BOT_TOOL_ERROR_INVALID_INPUT,
    });
  });
});

describe("admin menu and FAQ tools", () => {
  it("let an owner change availability, prices, FAQs and the profile", async () => {
    expect(await run(addMenuCategoryTool, { name: "Sandwiches", note: "Made to order" }, owner)).toMatchObject({
      name: "Sandwiches",
      note: "Made to order",
    });
    expect(await run(setMenuItemAvailabilityTool, { itemId: latteId, isAvailable: false }, owner)).toMatchObject({
      isAvailable: false,
    });
    expect(
      await run(updateMenuItemPriceTool, { itemId: latteId, variantName: null, price: 5 }, owner),
    ).toMatchObject({ price: "5.00" });
    expect(
      await run(addFaqTool, { categoryId: null, question: "Wi-Fi?", answer: "Ask at the counter." }, owner),
    ).toMatchObject({ question: "Wi-Fi?", category: null });
    expect(await run(updateFaqTool, { faqId, question: null, answer: "Yes, on the patio." }, owner)).toMatchObject({
      question: "Dogs?",
      answer: "Yes, on the patio.",
    });
    expect(
      await run(
        updateBusinessProfileTool,
        { description: null, websiteUrl: null, phone: "845-871-2010", email: null, address: null },
        owner,
      ),
    ).toMatchObject({ phone: "845-871-2010", email: null });
  });

  it("sells several items out in one call and brings them back", async () => {
    const out = await run(setMenuItemsAvailabilityTool, { itemIds: [latteId, muffinId, latteId], isAvailable: false }, owner);
    expect(out).toMatchObject({
      items: [
        expect.objectContaining({ id: latteId, isAvailable: false }),
        expect.objectContaining({ id: muffinId, isAvailable: false }),
      ],
      notFound: [],
    });
    expect(await run(setMenuItemsAvailabilityTool, { itemIds: [latteId, muffinId], isAvailable: true }, owner)).toMatchObject({
      items: [expect.objectContaining({ isAvailable: true }), expect.objectContaining({ isAvailable: true })],
    });
  });

  it("still finds a sold-out item so the owner can put it back on", async () => {
    await run(setMenuItemAvailabilityTool, { itemId: muffinId, isAvailable: false }, owner);
    const found = FindMenuItemsResultSchema.parse(
      await run(findMenuItemsTool, { text: "muffin", dietaryTag: null }, owner),
    );
    expect(found.items).toEqual([expect.objectContaining({ id: muffinId, isAvailable: false })]);
    expect(await run(findMenuItemsTool, { text: "muffin", dietaryTag: null }, customer)).toMatchObject({ items: [] });
    expect(
      await run(setMenuItemAvailabilityTool, { itemId: found.items[0].id, isAvailable: true }, owner),
    ).toMatchObject({ id: muffinId, isAvailable: true });
  });

  it("changes the rest and reports an item that is not the cafe's", async () => {
    const out = await run(setMenuItemsAvailabilityTool, { itemIds: [muffinId, otherItemId], isAvailable: false }, owner);
    expect(out).toMatchObject({ items: [expect.objectContaining({ id: muffinId, isAvailable: false })], notFound: [otherItemId] });
    await run(setMenuItemsAvailabilityTool, { itemIds: [muffinId], isAvailable: true }, owner);
  });

  it.each([
    ["no ids", { itemIds: [], isAvailable: false }],
    ["more than ten ids", { itemIds: Array.from({ length: 11 }, () => latteId), isAvailable: false }],
    ["an id that is not a uuid", { itemIds: ["latte"], isAvailable: false }],
  ])("rejects %s", async (_, input) => {
    expect(await run(setMenuItemsAvailabilityTool, input, owner)).toEqual({ error: CHAT_BOT_TOOL_ERROR_INVALID_INPUT });
  });

  // -----
  // The role is read from the database on
  // every call, never from the input.
  // -----
  it.each([
    ["setMenuItemAvailability", setMenuItemAvailabilityTool, () => ({ itemId: latteId, isAvailable: true })],
    ["setMenuItemsAvailability", setMenuItemsAvailabilityTool, () => ({ itemIds: [latteId], isAvailable: true })],
    ["updateMenuItemPrice", updateMenuItemPriceTool, () => ({ itemId: latteId, variantName: null, price: 1 })],
    ["addMenuCategory", addMenuCategoryTool, () => ({ name: "Tea", note: null })],
    ["addFaq", addFaqTool, () => ({ categoryId: null, question: "Q?", answer: "A." })],
    ["updateFaq", updateFaqTool, () => ({ faqId, question: "Q?", answer: null })],
    [
      "updateBusinessProfile",
      updateBusinessProfileTool,
      () => ({ description: null, websiteUrl: null, phone: "1", email: null, address: null }),
    ],
  ] as const)("refuses %s for a member or a Customer", async (_, tool, input) => {
    expect(await run(tool, input(), member)).toEqual({ error: CHAT_BOT_EDITOR_ONLY });
    expect(await run(tool, input(), customer)).toEqual({ error: CHAT_BOT_EDITOR_ONLY });
  });

  it("never changes another Tenant's item", async () => {
    expect(await run(setMenuItemAvailabilityTool, { itemId: otherItemId, isAvailable: false }, owner)).toHaveProperty(
      "error",
    );
  });

  it.each([
    ["an FAQ change with nothing to change", updateFaqTool, () => ({ faqId, question: null, answer: null })],
    [
      "a profile change with nothing to change",
      updateBusinessProfileTool,
      () => ({ description: null, websiteUrl: null, phone: null, email: null, address: null }),
    ],
    [
      "an email that isn't one",
      updateBusinessProfileTool,
      () => ({ description: null, websiteUrl: null, phone: null, email: "not-an-email", address: null }),
    ],
    ["a price that isn't positive", updateMenuItemPriceTool, () => ({ itemId: latteId, variantName: null, price: 0 })],
    ["a category with no name", addMenuCategoryTool, () => ({ name: "", note: null })],
    ["a category name that is too long", addMenuCategoryTool, () => ({ name: "x".repeat(81), note: null })],
  ] as const)("rejects %s before writing", async (_, tool, input) => {
    expect(await run(tool, input(), owner)).toEqual({ error: CHAT_BOT_TOOL_ERROR_INVALID_INPUT });
  });
});
