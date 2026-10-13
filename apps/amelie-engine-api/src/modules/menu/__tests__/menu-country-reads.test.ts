import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { menuItemPrices, tenantLocations, tenantMenuCategories, tenantMenuItemLocations } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import {
  getMenuEditorSvc,
  getMenuItemCardsSvc,
  listMenuSvc,
  searchMenuSvc,
  setMenuItemAvailabilitySvc,
  updateMenuItemPriceSvc,
} from "#/modules/menu";
import { findMenuItemsTool, listMenuTool, showMenuItemsTool } from "#/modules/chat-bot/agent-tools";
import { ListMenuResultSchema } from "#/modules/chat-bot/agent-tools/public/list-menu/schema";
import { FindMenuItemsResultSchema } from "#/modules/chat-bot/agent-tools/public/find-menu-items/schema";
import { ShowMenuItemsResultSchema } from "#/modules/chat-bot/agent-tools/public/show-menu-items/schema";
import type { ChatBotOwner, ChatBotToolSpec } from "#/modules/chat-bot/types";
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
// Menu reads quote the Country price (ADR-0002) and go
// through the one "sold at this Location" check.
// -----
let db: DbConnectType;

const newCategory = async (tenantId: string, name = "Menu") => {
  const [category] = await db.insert(tenantMenuCategories).values({ tenantId, name }).returning();
  return category.id;
};

const read = (tenantId: string, locationId?: string) => Effect.runPromise(listMenuSvc(db, tenantId, locationId));

const names = (menu: Awaited<ReturnType<typeof read>>) =>
  menu.flatMap((category) => category.items.map((item) => item.name)).toSorted();

const itemNamed = (menu: Awaited<ReturnType<typeof read>>, name: string) =>
  menu.flatMap((category) => category.items).find((item) => item.name === name);

beforeAll(async () => {
  db = await createTestDb();
});

describe("a one-Country cafe", () => {
  let tenantId: string;
  let locationId: string;

  beforeAll(async () => {
    tenantId = await insertTenant(db, "Solo", "solo", { country: "CA", currency: "CAD" });
    locationId = await defaultLocationId(db, tenantId);
    const categoryId = await newCategory(tenantId);
    await insertMenuItem(db, tenantId, {
      categoryId,
      name: "Latte",
      price: "4.75",
      variants: [
        { name: "Small", price: "4.75" },
        { name: "Large", price: "6.25" },
      ],
    });
    await insertMenuItem(db, tenantId, { categoryId, name: "Muffin", price: "3.00" });
  });

  it("quotes price, Variants and currency from the Country price at its Location", async () => {
    const [category] = await read(tenantId, locationId);

    expect(category.items.map((i) => [i.name, i.price, i.currency])).toEqual([
      ["Latte", "4.75", "CAD"],
      ["Muffin", "3.00", "CAD"],
    ]);
    expect(category.items[0].variants).toEqual([
      { name: "Small", price: "4.75" },
      { name: "Large", price: "6.25" },
    ]);
  });

  it("answers the same with no Location, from the only open Country", async () => {
    const [category] = await read(tenantId);

    expect(category.items.map((i) => [i.name, i.price, i.currency])).toEqual([
      ["Latte", "4.75", "CAD"],
      ["Muffin", "3.00", "CAD"],
    ]);
  });

  it("keeps a category with no items", async () => {
    await newCategory(tenantId, "Empty");

    expect((await read(tenantId, locationId)).map((c) => c.name)).toContain("Empty");
  });

  it("reads the Country price, never the item's own price column", async () => {
    const muffin = itemNamed(await read(tenantId), "Muffin");
    if (!muffin) throw new Error("Muffin missing");
    await db.update(menuItemPrices).set({ price: "3.25" }).where(eq(menuItemPrices.menuItemId, muffin.id));

    expect(itemNamed(await read(tenantId, locationId), "Muffin")?.price).toBe("3.25");
  });

  it("quotes a new number after the price is edited through the write path", async () => {
    const latte = itemNamed(await read(tenantId, locationId), "Latte");
    if (!latte) throw new Error("Latte missing");

    await runEffect(updateMenuItemPriceSvc(db, tenantId, latte.id, { variantName: "Large", price: 7 }));

    const after = itemNamed(await read(tenantId, locationId), "Latte");
    expect(after?.variants).toEqual([
      { name: "Small", price: "4.75" },
      { name: "Large", price: "7.00" },
    ]);
    const [card] = await runEffect(getMenuItemCardsSvc(db, tenantId, [latte.id], locationId));
    expect(card.variants?.[1].price).toBe("7.00");
    const toggled = await runEffect(setMenuItemAvailabilitySvc(db, tenantId, latte.id, true));
    expect(toggled.variants?.[1].price).toBe("7.00");
  });
});

describe("two Countries", () => {
  let tenantId: string;
  let usId: string;
  let caId: string;
  let usLocation: string;
  let caLocation: string;
  let usOnly: string;
  let caOnly: string;
  let both: string;
  let soldOff: string;
  let customer: ChatBotOwner;

  beforeAll(async () => {
    tenantId = await insertTenant(db, "Duo", "duo", { country: "US", currency: "USD" });
    usLocation = await defaultLocationId(db, tenantId);
    const [location] = await db.select().from(tenantLocations).where(eq(tenantLocations.id, usLocation));
    if (!location.countryId) throw new Error("Location has no Country");
    usId = location.countryId;
    caId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
    caLocation = await insertLocation(db, tenantId, { name: "Toronto", slug: "toronto", countryId: caId });
    const food = await newCategory(tenantId, "Food");
    const caFood = await newCategory(tenantId, "Poutine Corner");
    usOnly = (await insertMenuItem(db, tenantId, { categoryId: food, name: "Hot dog", price: "5.00", countryId: usId })).id;
    both = (await insertMenuItem(db, tenantId, { categoryId: food, name: "Coffee", price: "3.00", countryId: usId })).id;
    await insertMenuItemPrice(db, tenantId, both, caId, { price: "4.10" });
    soldOff = (await insertMenuItem(db, tenantId, { categoryId: food, name: "Pie", price: "6.00", countryId: usId })).id;
    await insertMenuItemPrice(db, tenantId, soldOff, caId, { price: "7.50", isSold: false });
    const unpriced = await insertMenuItem(db, tenantId, { categoryId: food, name: "Mystery", price: "1.00", countryId: usId });
    await db.delete(menuItemPrices).where(eq(menuItemPrices.menuItemId, unpriced.id));
    caOnly = (
      await insertMenuItem(db, tenantId, { categoryId: caFood, name: "Poutine", price: "9.00", countryId: caId })
    ).id;
    customer = { kind: "anonymous", tenantId, anonymousId: "a-1" };
  });

  it("never shows an item priced only in another Country, whatever the Location rules say", async () => {
    expect(names(await read(tenantId, caLocation))).not.toContain("Hot dog");
    expect(names(await read(tenantId, usLocation))).not.toContain("Poutine");
  });

  it("quotes each Location's own Country price and currency", async () => {
    expect(itemNamed(await read(tenantId, usLocation), "Coffee")).toMatchObject({ price: "3.00", currency: "USD" });
    expect(itemNamed(await read(tenantId, caLocation), "Coffee")).toMatchObject({ price: "4.10", currency: "CAD" });
  });

  it("hides an item whose sold-here flag is off there, and keeps the price", async () => {
    expect(names(await read(tenantId, caLocation))).not.toContain("Pie");
    expect(names(await read(tenantId, usLocation))).toContain("Pie");
    const [row] = await db
      .select()
      .from(menuItemPrices)
      .where(and(eq(menuItemPrices.menuItemId, soldOff), eq(menuItemPrices.countryId, caId)));
    expect(row).toMatchObject({ price: "7.50", isSold: false });
  });

  it("hides an item with no Country price at all", async () => {
    expect(names(await read(tenantId, usLocation))).not.toContain("Mystery");
  });

  it("still applies the Location rules inside a Country", async () => {
    const chicago = await insertLocation(db, tenantId, { name: "Chicago", slug: "chicago", countryId: usId });
    await db
      .insert(tenantMenuItemLocations)
      .values({ tenantId, menuItemId: usOnly, locationId: chicago, isAvailable: false });

    expect(names(await read(tenantId, chicago))).not.toContain("Hot dog");
    expect(names(await read(tenantId, usLocation))).toContain("Hot dog");
  });

  it("shows only categories with an item sold in the Country", async () => {
    expect((await read(tenantId, usLocation)).map((c) => c.name)).toEqual(["Food"]);
    expect((await read(tenantId, caLocation)).map((c) => c.name)).toEqual(["Food", "Poutine Corner"]);
  });

  it("with no Location and several open Countries, omits price and currency without failing", async () => {
    const items = (await read(tenantId)).flatMap((c) => c.items);

    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item).toMatchObject({ price: null, currency: null, variants: null });
  });

  it("every menu read goes through the shared check", async () => {
    const editor = await Effect.runPromise(getMenuEditorSvc(db, tenantId, caLocation));
    expect(editor.categories.flatMap((c) => c.items.map((i) => i.name))).not.toContain("Hot dog");

    const found = await Effect.runPromise(
      searchMenuSvc(db, tenantId, { text: "hot dog", dietaryTag: null }, caLocation),
    );
    expect(found).toEqual([]);

    const cards = await runEffect(getMenuItemCardsSvc(db, tenantId, [usOnly, both, soldOff, caOnly], caLocation));
    expect(cards.map((c) => [c.id, c.price, c.currency]).toSorted()).toEqual(
      [
        [both, "4.10", "CAD"],
        [caOnly, "9.00", "CAD"],
      ].toSorted(),
    );
  });

  it("the assistant's menu tools use the same check and the Country price", async () => {
    const run = (tool: ChatBotToolSpec, input: Parameters<ChatBotToolSpec["execute"]>[0]) =>
      Effect.runPromise(tool.execute(input, { db, owner: customer }));

    const listed = ListMenuResultSchema.parse(await run(listMenuTool, { locationId: "toronto" }));
    const items = listed.categories.flatMap((c) => c.items);
    expect(items.map((i) => i.name)).not.toContain("Hot dog");
    expect(items.find((i) => i.name === "Coffee")).toMatchObject({ price: "4.10", currency: "CAD" });

    const found = FindMenuItemsResultSchema.parse(
      await run(findMenuItemsTool, { locationId: "toronto", text: "hot dog", dietaryTag: null }),
    );
    expect(found.items).toEqual([]);
  });

  it("show-menu-items has no Country in play without a Thread Location, so it omits the price", async () => {
    const shown = ShowMenuItemsResultSchema.parse(
      await Effect.runPromise(showMenuItemsTool.execute({ ids: [both] }, { db, owner: customer })),
    );

    expect(shown.items).toEqual([expect.objectContaining({ price: null, currency: null })]);
  });
});

describe("menu reads and the old price columns", () => {
  it("no menu read takes a price or currency from the item or the Tenant", () => {
    const root = fileURLToPath(new URL("../../../", import.meta.url));
    // SAFETY: readdirSync with recursive: true and no encoding option returns strings.
    const files = (readdirSync(root, { recursive: true }) as string[])
      .filter((file) => file.endsWith(".ts") && !file.includes("__tests__") && !file.startsWith("modules/tenant/"))
      .map((file) => [file, readFileSync(root + file, "utf8")] as const);

    const readers = files
      .filter(([, source]) => /tenantMenuItems\.(price|variants)\b|tenants\.currency\b/.test(source))
      .map(([file]) => file);

    expect(readers).toEqual([]);
  });
});
