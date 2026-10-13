import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { tenantCountries, tenantMenuCategories } from "@repo/db-amelie";
import { eq } from "drizzle-orm";
import type { DbConnectType } from "#/lib/db-connection";
import { getMenuItemCardsSvc, listMenuSvc, searchMenuSvc } from "#/modules/menu/handlers";
import { readCountryIdEffect } from "#/modules/country";
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
// The explicit countryId input of the menu reads (ADR-0002,
// "Passing a Country"). A two-Country cafe: US (the first)
// and CA. The latte sells in both, the poutine only in CA.
// -----
let db: DbConnectType;
let tenantId: string;
let usId: string;
let caId: string;
let seattleId: string;
let latteId: string;
let poutineId: string;

const items = async (countryId?: string, locationId?: string) =>
  (await Effect.runPromise(listMenuSvc(db, tenantId, locationId, countryId))).flatMap((category) => category.items);

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Maple Cafe", "maple");
  const [us] = await db.select({ id: tenantCountries.id }).from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId));
  usId = us.id;
  caId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
  seattleId = await defaultLocationId(db, tenantId);
  await insertLocation(db, tenantId, { name: "Toronto", slug: "toronto" });
  const [category] = await db.insert(tenantMenuCategories).values({ tenantId, name: "Drinks" }).returning();
  const latte = await insertMenuItem(db, tenantId, { categoryId: category.id, name: "Latte", price: "4.00" });
  latteId = latte.id;
  await insertMenuItemPrice(db, tenantId, latteId, caId, { price: "5.50" });
  const poutine = await insertMenuItem(db, tenantId, { categoryId: category.id, name: "Poutine", price: "9.00", countryId: caId });
  poutineId = poutine.id;
});

describe("readCountryIdEffect with an explicit countryId", () => {
  it("uses the explicit open Country over the Location's", async () => {
    expect(await Effect.runPromise(readCountryIdEffect(db, tenantId, seattleId, caId))).toBe(caId);
  });

  it("is none for an id that is not an open Country of this Tenant", async () => {
    const foreign = await insertCountry(db, await insertTenant(db, "Other", "other"), { country: "FR", currency: "EUR" });
    expect(await Effect.runPromise(readCountryIdEffect(db, tenantId, undefined, foreign))).toBeNull();
  });
});

describe("menu reads with a countryId", () => {
  it("prices every item in that Country's currency, without a Location", async () => {
    const menu = await items(caId);

    expect(menu.map(({ name, price, currency }) => ({ name, price, currency }))).toEqual([
      { name: "Latte", price: "5.50", currency: "CAD" },
      { name: "Poutine", price: "9.00", currency: "CAD" },
    ]);
  });

  it("hides items not sold in that Country", async () => {
    expect((await items(usId)).map((item) => item.name)).toEqual(["Latte"]);
  });

  it("gives names but no prices with several Countries and none in play", async () => {
    const menu = await items(undefined, undefined);

    expect(menu.map(({ name, price, currency }) => ({ name, price, currency }))).toEqual([
      { name: "Latte", price: null, currency: null },
      { name: "Poutine", price: null, currency: null },
    ]);
  });

  it("find: searches inside that Country", async () => {
    const found = await Effect.runPromise(searchMenuSvc(db, tenantId, { text: "latte", dietaryTag: null }, undefined, caId));
    expect(found).toMatchObject([{ name: "Latte", price: "5.50", currency: "CAD" }]);
  });

  it("cards: price in that Country and drop items not sold there", async () => {
    const cards = await Effect.runPromise(getMenuItemCardsSvc(db, tenantId, [latteId, poutineId], undefined, usId));

    expect(cards.map(({ name, price, currency }) => ({ name, price, currency }))).toEqual([
      { name: "Latte", price: "4.00", currency: "USD" },
    ]);
  });
});
