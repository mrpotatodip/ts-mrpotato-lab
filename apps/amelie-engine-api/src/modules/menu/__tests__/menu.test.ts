import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import {
  dietaryTags,
  tenantMenuCategories,
  tenantMenuItemDietaryTags,
  tenantCountries,
} from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFoundError, ValidationError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import { listMenuEffect } from "#/modules/menu/queries";
import {
  getMenuItemCardsSvc,
  searchMenuSvc,
  setMenuItemAvailabilitySvc,
  updateMenuItemPriceSvc,
} from "#/modules/menu";
import {
  MENU_ITEM_HAS_NO_VARIANTS,
  MENU_VARIANT_NOT_FOUND,
  MENU_VARIANT_REQUIRED,
} from "#/modules/menu/constants";
import { createTestDb, insertMenuItem, insertMenuItems, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let otherCafeId: string;
let quicheId: string;
let latteId: string;
let otherCategoryId: string;
let otherItemId: string;

const tagId = async (slug: string) => {
  const [tag] = await db.select().from(dietaryTags).where(eq(dietaryTags.slug, slug));
  return tag.id;
};

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella");
  otherCafeId = await insertTenant(db, "Other Cafe", "other-cafe");
  const [breakfast, coffee] = await db
    .insert(tenantMenuCategories)
    .values([
      { tenantId: sorellaId, name: "Breakfast", sortOrder: 1 },
      { tenantId: sorellaId, name: "Coffee", note: "All syrups made in house.", sortOrder: 2 },
    ])
    .returning();
  const [quiche, latte] = await insertMenuItems(db, sorellaId, [
      { categoryId: breakfast.id, name: "Quiche", description: "spinach, ricotta", price: "10" },
      {
        categoryId: coffee.id,
        name: "Latte",
        price: "4.75",
        variants: [
          { name: "Small", price: "4.75" },
          { name: "Large", price: "6.25" },
        ],
      },
      { categoryId: coffee.id, name: "Pumpkin Latte", price: "6.50", isAvailable: false },
    ]);
  quicheId = quiche.id;
  latteId = latte.id;
  await db
    .insert(tenantMenuItemDietaryTags)
    .values({ tenantId: sorellaId, menuItemId: quiche.id, dietaryTagId: await tagId("vegetarian") });

  const [otherCategory] = await db
    .insert(tenantMenuCategories)
    .values({ tenantId: otherCafeId, name: "Mains" })
    .returning();
  otherCategoryId = otherCategory.id;
  const [otherItem] = await insertMenuItems(db, otherCafeId, [{ categoryId: otherCategory.id, name: "Secret Burger", price: "20" }]);
  otherItemId = otherItem.id;
});

describe("listMenuEffect", () => {
  it("returns Sorella's own menu in order, with Dietary tags (spec test 1)", async () => {
    const menu = await Effect.runPromise(listMenuEffect(db, sorellaId));

    expect(menu.map((c) => [c.name, c.items.map((i) => i.name)])).toEqual([
      ["Breakfast", ["Quiche"]],
      ["Coffee", ["Latte", "Pumpkin Latte"]],
    ]);
    expect(menu[0].items[0].dietaryTags).toEqual(["vegetarian"]);
  });

  it("never returns Sorella's menu to another Tenant (spec test 2)", async () => {
    const menu = await Effect.runPromise(listMenuEffect(db, otherCafeId));

    expect(menu.flatMap((c) => c.items.map((i) => i.id))).toEqual([otherItemId]);
  });
});

describe("menu currency", () => {
  it("comes from the Country, so changing the Country currency relabels every read", async () => {
    const manilaId = await insertTenant(db, "Manila Cafe", "manila-cafe");
    const [category] = await db.insert(tenantMenuCategories).values({ tenantId: manilaId, name: "Coffee" }).returning();
    const [item] = await insertMenuItems(db, manilaId, [{ categoryId: category.id, name: "Latte", price: "4.75" }]);
    const read = async () => ({
      list: (await Effect.runPromise(listMenuEffect(db, manilaId)))[0].items[0].currency,
      card: (await runEffect(getMenuItemCardsSvc(db, manilaId, [item.id])))[0].currency,
      price: (await runEffect(updateMenuItemPriceSvc(db, manilaId, item.id, { variantName: null, price: 4.75 }))).currency,
    });

    expect(await read()).toEqual({ list: "USD", card: "USD", price: "USD" });
    await db.update(tenantCountries).set({ currency: "PHP" }).where(eq(tenantCountries.tenantId, manilaId));

    expect(await read()).toEqual({ list: "PHP", card: "PHP", price: "PHP" });
  });
});

describe("menu cross-Tenant references", () => {
  it("rejects a Menu item in another Tenant's category (spec test 6)", async () => {
    await expect(
      insertMenuItem(db, sorellaId, { categoryId: otherCategoryId, name: "Stray", price: "1" }),
    ).rejects.toMatchObject({ cause: { constraint: "tenant_menu_items_category_in_tenant_fk" } });
  });

  it("rejects a Dietary tag link that crosses Tenants", async () => {
    await expect(
      db
        .insert(tenantMenuItemDietaryTags)
        .values({ tenantId: sorellaId, menuItemId: otherItemId, dietaryTagId: await tagId("vegan") }),
    ).rejects.toMatchObject({ cause: { constraint: "tenant_menu_item_dietary_tags_item_in_tenant_fk" } });
  });
});

describe("searchMenuSvc", () => {
  it("matches text in names, descriptions and categories, case-insensitively", async () => {
    const byName = await runEffect(searchMenuSvc(db, sorellaId, { text: "LATTE", dietaryTag: null }));
    const byDescription = await runEffect(searchMenuSvc(db, sorellaId, { text: "ricotta", dietaryTag: null }));

    expect(byName.map((i) => [i.name, i.category])).toEqual([
      ["Latte", "Coffee"],
      ["Pumpkin Latte", "Coffee"],
    ]);
    expect(byDescription.map((i) => i.name)).toEqual(["Quiche"]);
  });

  it("filters by an exact Dietary tag, and never searches another Tenant", async () => {
    const vegetarian = await runEffect(searchMenuSvc(db, sorellaId, { text: null, dietaryTag: "vegetarian" }));
    const burger = await runEffect(searchMenuSvc(db, sorellaId, { text: "burger", dietaryTag: null }));

    expect(vegetarian.map((i) => i.name)).toEqual(["Quiche"]);
    expect(burger).toEqual([]);
  });
});

describe("getMenuItemCardsSvc", () => {
  it("keeps only the Tenant's own items, in order, once each", async () => {
    const cards = await runEffect(
      getMenuItemCardsSvc(db, sorellaId, [latteId, "made-up", otherItemId, quicheId, latteId]),
    );

    expect(cards.map((c) => c.name)).toEqual(["Latte", "Quiche"]);
    expect(cards[0]).toEqual({
      id: latteId,
      name: "Latte",
      price: "4.75",
      currency: "USD",
      variants: [
        { name: "Small", price: "4.75" },
        { name: "Large", price: "6.25" },
      ],
      imageUrl: null,
    });
  });
});

describe("setMenuItemAvailabilitySvc", () => {
  it("marks an item sold out and back on", async () => {
    expect(await runEffect(setMenuItemAvailabilitySvc(db, sorellaId, quicheId, false))).toMatchObject({
      name: "Quiche",
      isAvailable: false,
    });
    expect(await runEffect(setMenuItemAvailabilitySvc(db, sorellaId, quicheId, true))).toMatchObject({
      isAvailable: true,
    });
  });

  it("never changes another Tenant's item", async () => {
    await expect(runEffect(setMenuItemAvailabilitySvc(db, sorellaId, otherItemId, false))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("updateMenuItemPriceSvc", () => {
  it("changes one Variant and keeps the item price at the lowest Variant", async () => {
    const lowered = await runEffect(
      updateMenuItemPriceSvc(db, sorellaId, latteId, { variantName: "small", price: 4.5 }),
    );
    expect(lowered).toMatchObject({
      price: "4.50",
      variants: [
        { name: "Small", price: "4.50" },
        { name: "Large", price: "6.25" },
      ],
    });

    const raised = await runEffect(
      updateMenuItemPriceSvc(db, sorellaId, latteId, { variantName: "Small", price: 7 }),
    );
    expect(raised).toMatchObject({ price: "6.25" });
  });

  it("changes the price of an item without Variants", async () => {
    expect(
      await runEffect(updateMenuItemPriceSvc(db, sorellaId, quicheId, { variantName: null, price: 11 })),
    ).toMatchObject({ price: "11.00", variants: null });
  });

  it.each([
    ["no Variant name for an item with Variants", "latte", null, MENU_VARIANT_REQUIRED],
    ["a Variant the item doesn't have", "latte", "Medium", MENU_VARIANT_NOT_FOUND],
    ["a Variant name for an item without Variants", "quiche", "Large", MENU_ITEM_HAS_NO_VARIANTS],
  ])("refuses %s", async (_, item, variantName, message) => {
    const itemId = item === "latte" ? latteId : quicheId;

    await expect(
      runEffect(updateMenuItemPriceSvc(db, sorellaId, itemId, { variantName, price: 5 })),
    ).rejects.toEqual(new ValidationError(message));
  });

  it("never changes another Tenant's item", async () => {
    await expect(
      runEffect(updateMenuItemPriceSvc(db, sorellaId, otherItemId, { variantName: null, price: 1 })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
