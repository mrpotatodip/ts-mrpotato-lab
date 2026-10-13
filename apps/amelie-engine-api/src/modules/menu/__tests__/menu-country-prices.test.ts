import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { menuItemPrices, tenantCountries } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { addMenuCategorySvc, addMenuItemSvc, updateMenuItemPriceSvc, updateMenuItemSvc } from "#/modules/menu";
import { createTestDb, insertCountry, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let countryId: string;
let categoryId: string;

type ItemInput = Parameters<typeof addMenuItemSvc>[2];

const itemInput = (overrides: Partial<ItemInput> = {}): ItemInput => ({
  categoryId,
  name: "Muffin",
  description: null,
  price: "4.00",
  variants: null,
  isAvailable: true,
  dietaryTags: [],
  ...overrides,
});

const priceRows = (itemId: string) => db.select().from(menuItemPrices).where(eq(menuItemPrices.menuItemId, itemId));

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Sorella Cafe", "sorella", { country: "CA", currency: "CAD" });
  const [country] = await db.select().from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId));
  countryId = country.id;
  categoryId = (await runEffect(addMenuCategorySvc(db, tenantId, { name: "Bakery", note: null }))).id;
});

describe("Country prices written with menu items", () => {
  it("creating an item writes its price, sold, in the Tenant's Country", async () => {
    const muffin = await runEffect(addMenuItemSvc(db, tenantId, itemInput()));

    const rows = await priceRows(muffin.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ tenantId, countryId, price: "4.00", variants: null, isSold: true });
  });

  it("creating an item with Variants writes the Variants and the lowest price", async () => {
    const variants = [
      { name: "Large", price: "6.25" },
      { name: "Small", price: "4.75" },
    ];
    const latte = await runEffect(addMenuItemSvc(db, tenantId, itemInput({ name: "Latte", price: null, variants })));

    const [row] = await priceRows(latte.id);
    expect(row).toMatchObject({ price: "4.75", variants, isSold: true });
  });

  it("editing an item updates its price row, not a second one", async () => {
    const scone = await runEffect(addMenuItemSvc(db, tenantId, itemInput({ name: "Scone", price: "3.00" })));

    await runEffect(updateMenuItemSvc(db, tenantId, scone.id, itemInput({ name: "Scone", price: "3.50" })));

    const rows = await priceRows(scone.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ price: "3.50", variants: null });
  });

  it("editing an item keeps a price row turned off sold-here off", async () => {
    const bagel = await runEffect(addMenuItemSvc(db, tenantId, itemInput({ name: "Bagel" })));
    await db.update(menuItemPrices).set({ isSold: false }).where(eq(menuItemPrices.menuItemId, bagel.id));

    await runEffect(updateMenuItemSvc(db, tenantId, bagel.id, itemInput({ name: "Bagel", price: "5.00" })));

    const [row] = await priceRows(bagel.id);
    expect(row).toMatchObject({ price: "5.00", isSold: false });
  });

  it("the assistant's price change updates the price row, with and without Variants", async () => {
    const tea = await runEffect(addMenuItemSvc(db, tenantId, itemInput({ name: "Tea", price: "2.00" })));
    await runEffect(updateMenuItemPriceSvc(db, tenantId, tea.id, { variantName: null, price: 2.5 }));
    expect((await priceRows(tea.id))[0]).toMatchObject({ price: "2.50" });

    const variants = [
      { name: "Large", price: "6.00" },
      { name: "Small", price: "4.00" },
    ];
    const mocha = await runEffect(addMenuItemSvc(db, tenantId, itemInput({ name: "Mocha", price: null, variants })));
    await runEffect(updateMenuItemPriceSvc(db, tenantId, mocha.id, { variantName: "Small", price: 3.5 }));
    expect((await priceRows(mocha.id))[0]).toMatchObject({
      price: "3.50",
      variants: [
        { name: "Large", price: "6.00" },
        { name: "Small", price: "3.50" },
      ],
    });
  });

  it("writes into the Country the item names when the Tenant has several", async () => {
    const other = await insertTenant(db, "Two Countries", "two");
    const [first] = await db.select().from(tenantCountries).where(eq(tenantCountries.tenantId, other));
    await insertCountry(db, other, { country: "MX", currency: "MXN" });
    const cat = await runEffect(addMenuCategorySvc(db, other, { name: "Bakery", note: null }));

    const item = await runEffect(addMenuItemSvc(db, other, itemInput({ categoryId: cat.id, countryId: first.id })));

    const rows = await priceRows(item.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].countryId).toBe(first.id);
  });
});
