import { beforeAll, describe, expect, it } from "vitest";
import { tenantMenuCategories } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFoundError, ValidationError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import { listMenuSvc } from "#/modules/menu";
import {
  addMenuItemImagesSvc,
  deleteMenuItemImageSvc,
  getMenuItemImageBytesSvc,
  reorderMenuItemImagesSvc,
  setMenuItemImageCoverSvc,
} from "#/modules/menu/handlers";
import { menuItemImagePublicPath } from "#/modules/menu/lib";
import { MENU_ITEM_IMAGE_TOO_MANY, MENU_ORDER_MISMATCH } from "#/modules/menu/constants";
import type { MenuImageStorage, MenuItemImageFile } from "#/modules/menu/types";
import { createTestDb, insertMenuItem, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let otherCafeId: string;
let itemId: string;
let otherItemId: string;

const stored = new Map<string, ArrayBuffer>();

const storage = (): MenuImageStorage => ({
  put: async (key, bytes) => {
    stored.set(key, bytes);
  },
  get: async (key) => stored.get(key) ?? null,
  delete: async (key) => {
    stored.delete(key);
  },
});

const jpeg = (name = "latte.jpg", size = 8): MenuItemImageFile => ({
  name,
  contentType: "image/jpeg",
  bytes: new ArrayBuffer(size),
});

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella-images");
  otherCafeId = await insertTenant(db, "Other Cafe", "other-images");
  const [breakfast] = await db
    .insert(tenantMenuCategories)
    .values({ tenantId: sorellaId, name: "Breakfast" })
    .returning();
  const item = await insertMenuItem(db, sorellaId, { categoryId: breakfast.id, name: "Latte", price: "4.75" });
  itemId = item.id;
  const [theirs] = await db
    .insert(tenantMenuCategories)
    .values({ tenantId: otherCafeId, name: "Mains" })
    .returning();
  const other = await insertMenuItem(db, otherCafeId, { categoryId: theirs.id, name: "Burger", price: "12" });
  otherItemId = other.id;
});

describe("menu item images", () => {
  it("stores a photo under the Tenant prefix, serves the bytes, and lists it as imageUrl", async () => {
    const [created] = await runEffect(addMenuItemImagesSvc(db, storage(), sorellaId, itemId, [jpeg()]));

    expect(created).toMatchObject({ name: "latte.jpg", contentType: "image/jpeg", size: 8, sortOrder: 0 });
    expect([...stored.keys()].find((key) => key.includes(created.id))).toMatch(
      new RegExp(`^menu-items/${sorellaId}/${itemId}/${created.id}-`),
    );

    const served = await runEffect(getMenuItemImageBytesSvc(db, storage(), created.id));
    expect(served.contentType).toBe("image/jpeg");
    expect(served.bytes.byteLength).toBe(8);

    const latte = (await runEffect(listMenuSvc(db, sorellaId)))
      .flatMap((category) => category.items)
      .find((item) => item.name === "Latte");
    expect(latte?.imageUrl).toBe(menuItemImagePublicPath(created.id));
    expect(latte?.images).toEqual([
      { id: created.id, name: "latte.jpg", contentType: "image/jpeg", size: 8, sortOrder: 0 },
    ]);
  });

  it("refuses a PDF, a foreign item, and an 11th photo", async () => {
    await expect(
      runEffect(addMenuItemImagesSvc(db, storage(), sorellaId, itemId, [{ ...jpeg(), contentType: "application/pdf" }])),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(runEffect(addMenuItemImagesSvc(db, storage(), sorellaId, otherItemId, [jpeg("x.jpg")]))).rejects.toBeInstanceOf(
      NotFoundError,
    );

    const [capCategory] = await db
      .insert(tenantMenuCategories)
      .values({ tenantId: sorellaId, name: "Cap" })
      .returning();
    const extra = await insertMenuItem(db, sorellaId, { categoryId: capCategory.id, name: "Cap", price: "1.00" });
    for (let n = 0; n < 10; n += 1) {
      await runEffect(addMenuItemImagesSvc(db, storage(), sorellaId, extra.id, [jpeg(`n${n}.jpg`, 4)]));
    }
    await expect(runEffect(addMenuItemImagesSvc(db, storage(), sorellaId, extra.id, [jpeg("overflow.jpg")]))).rejects.toMatchObject({
      message: MENU_ITEM_IMAGE_TOO_MANY,
    });
  });

  it("stores several photos in one call, in order", async () => {
    const [batchCategory] = await db
      .insert(tenantMenuCategories)
      .values({ tenantId: sorellaId, name: "Batch" })
      .returning();
    const muffin = await insertMenuItem(db, sorellaId, { categoryId: batchCategory.id, name: "Muffin", price: "4.00" });
    const created = await runEffect(
      addMenuItemImagesSvc(db, storage(), sorellaId, muffin.id, [jpeg("a.jpg", 4), jpeg("b.png", 6)]),
    );
    expect(created.map((row) => [row.name, row.sortOrder, row.size])).toEqual([
      ["a.jpg", 0, 4],
      ["b.png", 1, 6],
    ]);
  });

  it("puts a later photo first so cards show it", async () => {
    const [coverCategory] = await db
      .insert(tenantMenuCategories)
      .values({ tenantId: sorellaId, name: "Cover" })
      .returning();
    const tart = await insertMenuItem(db, sorellaId, { categoryId: coverCategory.id, name: "Tart", price: "5.00" });
    const created = await runEffect(
      addMenuItemImagesSvc(db, storage(), sorellaId, tart.id, [jpeg("first.jpg", 4), jpeg("second.jpg", 6)]),
    );
    const ordered = await runEffect(setMenuItemImageCoverSvc(db, sorellaId, tart.id, created[1].id));
    expect(ordered.map((row) => row.name)).toEqual(["second.jpg", "first.jpg"]);
    const item = (await runEffect(listMenuSvc(db, sorellaId)))
      .flatMap((category) => category.items)
      .find((entry) => entry.id === tart.id);
    expect(item?.imageUrl).toBe(menuItemImagePublicPath(created[1].id));
  });

  it("rearranges photos and refuses a list that is not exactly this item's ids", async () => {
    const [orderCategory] = await db
      .insert(tenantMenuCategories)
      .values({ tenantId: sorellaId, name: "Order" })
      .returning();
    const pie = await insertMenuItem(db, sorellaId, { categoryId: orderCategory.id, name: "Pie", price: "7.00" });
    const created = await runEffect(
      addMenuItemImagesSvc(db, storage(), sorellaId, pie.id, [jpeg("a.jpg", 4), jpeg("b.jpg", 5), jpeg("c.jpg", 6)]),
    );
    const swapped = await runEffect(
      reorderMenuItemImagesSvc(db, sorellaId, pie.id, [created[1].id, created[0].id, created[2].id]),
    );
    expect(swapped.map((row) => row.name)).toEqual(["b.jpg", "a.jpg", "c.jpg"]);
    await expect(runEffect(reorderMenuItemImagesSvc(db, sorellaId, pie.id, [created[0].id]))).rejects.toMatchObject({
      message: MENU_ORDER_MISMATCH,
    });
  });

  it("deletes the row and the object, and 404s a missing id", async () => {
    const [created] = await runEffect(addMenuItemImagesSvc(db, storage(), sorellaId, itemId, [jpeg("gone.jpg")]));
    expect(stored.has([...stored.keys()].find((key) => key.includes(created.id)) ?? "")).toBe(true);

    await runEffect(deleteMenuItemImageSvc(db, storage(), sorellaId, itemId, created.id));
    expect([...stored.keys()].some((key) => key.includes(created.id))).toBe(false);

    await expect(runEffect(getMenuItemImageBytesSvc(db, storage(), created.id))).rejects.toBeInstanceOf(NotFoundError);
    await expect(runEffect(deleteMenuItemImageSvc(db, storage(), sorellaId, itemId, created.id))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
