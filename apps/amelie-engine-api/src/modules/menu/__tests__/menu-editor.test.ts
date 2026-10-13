import { beforeAll, describe, expect, it } from "vitest";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFoundError, ValidationError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import { MenuItemBodySchema } from "@repo/contracts/amelie";
import {
  addMenuCategorySvc,
  addMenuItemSvc,
  deleteMenuCategorySvc,
  deleteMenuItemSvc,
  getMenuEditorSvc,
  reorderMenuCategoriesSvc,
  reorderMenuItemsSvc,
  updateMenuCategorySvc,
  updateMenuItemSvc,
} from "#/modules/menu";
import { MENU_CATEGORY_NOT_FOUND, MENU_DIETARY_TAG_UNKNOWN, MENU_ORDER_MISMATCH } from "#/modules/menu/constants";
import { createTestDb, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let otherCafeId: string;
let tagSlugs: string[];

type ItemInput = Parameters<typeof addMenuItemSvc>[2];

const itemInput = (categoryId: string, overrides: Partial<ItemInput> = {}): ItemInput => ({
  categoryId,
  name: "Muffin",
  description: null,
  price: "4.00",
  variants: null,
  isAvailable: true,
  dietaryTags: [],
  ...overrides,
});

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella");
  otherCafeId = await insertTenant(db, "Other Cafe", "other-cafe");
  tagSlugs = (await runEffect(getMenuEditorSvc(db, sorellaId))).dietaryTags.map((tag) => tag.slug);
});

describe("menu categories", () => {
  it("adds categories last, renames one, and reorders them", async () => {
    const coffee = await runEffect(addMenuCategorySvc(db, sorellaId, { name: "Coffee", note: null }));
    const pastry = await runEffect(addMenuCategorySvc(db, sorellaId, { name: "Pastry", note: "Baked daily" }));

    const renamed = await runEffect(updateMenuCategorySvc(db, sorellaId, pastry.id, { name: "Pastries", note: null }));
    const reordered = await runEffect(reorderMenuCategoriesSvc(db, sorellaId, [pastry.id, coffee.id]));

    expect(renamed).toMatchObject({ name: "Pastries", note: null });
    expect(reordered.map((c) => c.name)).toEqual(["Pastries", "Coffee"]);
  });

  it("refuses an order that leaves out, repeats or adds an id", async () => {
    const { categories } = await runEffect(getMenuEditorSvc(db, sorellaId));
    const [first, second] = categories;
    const otherCategory = await runEffect(addMenuCategorySvc(db, otherCafeId, { name: "Theirs", note: null }));

    await expect(runEffect(reorderMenuCategoriesSvc(db, sorellaId, [first.id]))).rejects.toEqual(
      new ValidationError(MENU_ORDER_MISMATCH),
    );
    await expect(runEffect(reorderMenuCategoriesSvc(db, sorellaId, [first.id, first.id]))).rejects.toBeInstanceOf(ValidationError);
    await expect(
      runEffect(reorderMenuCategoriesSvc(db, sorellaId, [first.id, second.id, otherCategory.id])),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("never changes or deletes another Tenant's category", async () => {
    const { categories } = await runEffect(getMenuEditorSvc(db, sorellaId));

    await expect(
      runEffect(updateMenuCategorySvc(db, otherCafeId, categories[0].id, { name: "X", note: null })),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(runEffect(deleteMenuCategorySvc(db, otherCafeId, categories[0].id))).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("menu items", () => {
  it("adds an item with Dietary tags, and the price is the lowest Variant", async () => {
    const [category] = (await runEffect(getMenuEditorSvc(db, sorellaId))).categories;

    const latte = await runEffect(
      addMenuItemSvc(
        db,
        sorellaId,
        itemInput(category.id, {
          name: "Latte",
          price: null,
          variants: [
            { name: "Large", price: "6.25" },
            { name: "Small", price: "4.75" },
          ],
          dietaryTags: [tagSlugs[0]],
        }),
      ),
    );

    expect(latte).toMatchObject({ name: "Latte", price: "4.75", dietaryTags: [tagSlugs[0]] });
  });

  it("ignores a stray currency in the body and prices in the Tenant's currency", async () => {
    const [category] = (await runEffect(getMenuEditorSvc(db, sorellaId))).categories;
    const body = MenuItemBodySchema.parse({ ...itemInput(category.id, { name: "Scone" }), currency: "EUR" });

    const scone = await runEffect(addMenuItemSvc(db, sorellaId, body));

    expect(body).not.toHaveProperty("currency");
    expect(scone).toMatchObject({ name: "Scone", currency: "USD" });
  });

  it("refuses another Tenant's category and an unknown Dietary tag", async () => {
    const theirs = (await runEffect(getMenuEditorSvc(db, otherCafeId))).categories[0];
    const mine = (await runEffect(getMenuEditorSvc(db, sorellaId))).categories[0];

    await expect(runEffect(addMenuItemSvc(db, sorellaId, itemInput(theirs.id)))).rejects.toEqual(
      new ValidationError(MENU_CATEGORY_NOT_FOUND),
    );
    await expect(
      runEffect(addMenuItemSvc(db, sorellaId, itemInput(mine.id, { dietaryTags: ["not-a-tag"] }))),
    ).rejects.toEqual(new ValidationError(MENU_DIETARY_TAG_UNKNOWN));
  });

  it("changes an item, replaces its tags, moves it, and keeps it when marked unavailable", async () => {
    const { categories } = await runEffect(getMenuEditorSvc(db, sorellaId));
    const item = await runEffect(addMenuItemSvc(db, sorellaId, itemInput(categories[0].id, { dietaryTags: [tagSlugs[0]] })));

    const changed = await runEffect(
      updateMenuItemSvc(
        db,
        sorellaId,
        item.id,
        itemInput(categories[1].id, { name: "Big Muffin", price: "4.50", isAvailable: false, dietaryTags: [tagSlugs[1]] }),
      ),
    );

    expect(changed).toMatchObject({ name: "Big Muffin", price: "4.50", isAvailable: false, dietaryTags: [tagSlugs[1]] });
    const moved = (await runEffect(getMenuEditorSvc(db, sorellaId))).categories.find((c) => c.id === categories[1].id);
    expect(moved?.items.some((i) => i.id === item.id)).toBe(true);
  });

  it("never changes or deletes another Tenant's item", async () => {
    const [category] = (await runEffect(getMenuEditorSvc(db, otherCafeId))).categories;
    const theirs = await runEffect(addMenuItemSvc(db, otherCafeId, itemInput(category.id, { name: "Theirs" })));
    const mine = (await runEffect(getMenuEditorSvc(db, sorellaId))).categories[0];

    await expect(runEffect(updateMenuItemSvc(db, sorellaId, theirs.id, itemInput(mine.id)))).rejects.toBeInstanceOf(NotFoundError);
    await expect(runEffect(deleteMenuItemSvc(db, sorellaId, theirs.id))).rejects.toBeInstanceOf(NotFoundError);
  });

  it("reorders the items of one category, and deleting a category deletes its items", async () => {
    const category = await runEffect(addMenuCategorySvc(db, sorellaId, { name: "Sandwiches", note: null }));
    const a = await runEffect(addMenuItemSvc(db, sorellaId, itemInput(category.id, { name: "A" })));
    const b = await runEffect(addMenuItemSvc(db, sorellaId, itemInput(category.id, { name: "B" })));

    const after = await runEffect(reorderMenuItemsSvc(db, sorellaId, category.id, [b.id, a.id]));
    expect(after.find((c) => c.id === category.id)?.items.map((i) => i.name)).toEqual(["B", "A"]);

    await runEffect(deleteMenuCategorySvc(db, sorellaId, category.id));
    const gone = (await runEffect(getMenuEditorSvc(db, sorellaId))).categories.flatMap((c) => c.items);
    expect(gone.some((i) => i.id === a.id || i.id === b.id)).toBe(false);
  });
});

describe("MenuItemBodySchema", () => {
  const base = {
    categoryId: "0b8c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4",
    name: "Latte",
    description: null,
    price: null,
      variants: null,
    isAvailable: true,
    dietaryTags: [],
  };

  it("needs a price without Variants, and different Variant names", () => {
    expect(MenuItemBodySchema.safeParse(base).success).toBe(false);
    expect(MenuItemBodySchema.safeParse({ ...base, price: "4.75" }).success).toBe(true);
    expect(
      MenuItemBodySchema.safeParse({ ...base, variants: [{ name: "Large", price: "6" }, { name: "large", price: "7" }] }).success,
    ).toBe(false);
    expect(MenuItemBodySchema.safeParse({ ...base, price: "4.755" }).success).toBe(false);
  });
});
