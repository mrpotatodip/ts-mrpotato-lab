import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { and, eq } from "drizzle-orm";
import { menuItemPrices, tenantCountries, tenantMenuCategories } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { updateMenuItemPriceTool } from "#/modules/chat-bot/agent-tools";
import type { UpdateMenuItemPriceInput } from "#/modules/chat-bot/agent-tools/admin/update-menu-item-price";
import type { ChatBotOwner } from "#/modules/chat-bot/types";
import {
  createTestDb,
  insertCountry,
  insertMember,
  insertMenuItem,
  insertMenuItemPrice,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

// -----
// The signed-in assistant's price tool and Countries.
// Real-model behaviour (does it ask, does it pass the
// Country) is not tested here: these check what the
// tool returns and what it writes.
// -----
let db: DbConnectType;
let owner: ChatBotOwner;
let soloOwner: ChatBotOwner;
let usId: string;
let caId: string;
let latteId: string;
let mochaId: string;
let soloLatteId: string;
let foreignCountryId: string;

const call = (input: Partial<UpdateMenuItemPriceInput>, who: ChatBotOwner = owner) =>
  Effect.runPromise(
    updateMenuItemPriceTool.execute({ itemId: latteId, variantName: null, price: 6.5, ...input }, { db, owner: who }),
  );

const priceIn = async (itemId: string, countryId: string) => {
  const [row] = await db
    .select()
    .from(menuItemPrices)
    .where(and(eq(menuItemPrices.menuItemId, itemId), eq(menuItemPrices.countryId, countryId)));
  return row;
};

const setupOwner = async (tenant: string, email: string): Promise<ChatBotOwner> => {
  const login = await insertPersonWithLogin(db, email);
  await insertMember(db, tenant, login.partyId, "owner");
  return { kind: "user", tenantId: tenant, userId: login.userId };
};

beforeAll(async () => {
  db = await createTestDb();
  const tenantId = await insertTenant(db, "Maple Cafe", "maple");
  const [us] = await db.select({ id: tenantCountries.id }).from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId));
  usId = us.id;
  caId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
  await insertCountry(db, tenantId, { country: "JP", currency: "JPY", archivedAt: new Date() });
  foreignCountryId = await insertCountry(db, await insertTenant(db, "Other Cafe", "other"), { country: "FR", currency: "EUR" });
  owner = await setupOwner(tenantId, "owner@maple.test");
  const [category] = await db.insert(tenantMenuCategories).values({ tenantId, name: "Drinks" }).returning();
  latteId = (await insertMenuItem(db, tenantId, { categoryId: category.id, name: "Latte", price: "4.00" })).id;
  await insertMenuItemPrice(db, tenantId, latteId, caId, { price: "5.50" });
  mochaId = (
    await insertMenuItem(db, tenantId, {
      categoryId: category.id,
      name: "Mocha",
      price: "4.00",
      variants: [
        { name: "Large", price: "6.00" },
        { name: "Small", price: "4.00" },
      ],
    })
  ).id;
  await insertMenuItemPrice(db, tenantId, mochaId, caId, {
    price: "5.00",
    variants: [
      { name: "Large", price: "7.00" },
      { name: "Small", price: "5.00" },
    ],
  });

  const soloId = await insertTenant(db, "Solo Cafe", "solo");
  const [soloCategory] = await db.insert(tenantMenuCategories).values({ tenantId: soloId, name: "Drinks" }).returning();
  soloLatteId = (await insertMenuItem(db, soloId, { categoryId: soloCategory.id, name: "Latte", price: "4.00" })).id;
  soloOwner = await setupOwner(soloId, "owner@solo.test");
});

describe("updateMenuItemPrice with Countries", () => {
  it("changes a one-Country cafe's price with no question", async () => {
    const result = await call({ itemId: soloLatteId }, soloOwner);

    expect(result).toMatchObject({ id: soloLatteId, price: "6.50" });
  });

  it("writes nothing for a made-up country even at a one-Country cafe", async () => {
    const result = await call({ itemId: soloLatteId, countryId: "Atlantis", price: 9 }, soloOwner);

    expect(result).toMatchObject({ needsCountry: true, countries: [{ code: "US" }] });
  });

  it("changes nothing with several open Countries and none named, and returns the choices", async () => {
    const result = await call({});

    expect(result).toMatchObject({
      needsCountry: true,
      countries: [
        { id: usId, name: "United States", code: "US" },
        { id: caId, name: "Canada", code: "CA" },
      ],
    });
    expect(result).toHaveProperty("message", expect.stringMatching(/which country/i));
    expect((await priceIn(latteId, usId)).price).toBe("4.00");
    expect((await priceIn(latteId, caId)).price).toBe("5.50");
  });

  it.each([["Canada"], ["canada"], ["ca"], ["CA"]])("changes only the Canada price when told %s", async (countryId) => {
    await call({ countryId, price: 6.5 });

    expect((await priceIn(latteId, caId)).price).toBe("6.50");
    expect((await priceIn(latteId, usId)).price).toBe("4.00");
    await call({ countryId: "Canada", price: 5.5 });
  });

  it("takes the Country's id too", async () => {
    await call({ countryId: usId, price: 4.25 });

    expect((await priceIn(latteId, usId)).price).toBe("4.25");
    expect((await priceIn(latteId, caId)).price).toBe("5.50");
    await call({ countryId: usId, price: 4 });
  });

  it("changes a Variant in that Country only and keeps the lowest-Variant rule", async () => {
    const result = await call({ itemId: mochaId, countryId: "CA", variantName: "Small", price: 5.5 });

    const ca = await priceIn(mochaId, caId);
    expect(ca.price).toBe("5.50");
    expect(ca.variants).toEqual([
      { name: "Large", price: "7.00" },
      { name: "Small", price: "5.50" },
    ]);
    expect(result).toMatchObject({ price: "5.50", currency: "CAD" });
    const us = await priceIn(mochaId, usId);
    expect(us.price).toBe("4.00");
    expect(us.variants).toEqual([
      { name: "Large", price: "6.00" },
      { name: "Small", price: "4.00" },
    ]);
  });

  it("asks for the Country before anything else, writing nothing", async () => {
    const result = await call({ itemId: mochaId, variantName: "Large", price: 1 });

    expect(result).toHaveProperty("needsCountry", true);
    expect((await priceIn(mochaId, usId)).variants).toEqual([
      { name: "Large", price: "6.00" },
      { name: "Small", price: "4.00" },
    ]);
  });

  it.each([
    ["a made-up country", "Atlantis"],
    ["an archived Country", "JP"],
    ["another cafe's Country (by name)", "France"],
  ])("writes nothing for %s and returns the valid options", async (_, countryId) => {
    const result = await call({ countryId });

    expect(result).toMatchObject({ needsCountry: true, countries: [{ code: "US" }, { code: "CA" }] });
    expect(result).toHaveProperty("message", expect.stringContaining(countryId));
    expect((await priceIn(latteId, usId)).price).toBe("4.00");
    expect((await priceIn(latteId, caId)).price).toBe("5.50");
  });

  it("writes nothing for another cafe's Country id", async () => {
    const result = await call({ countryId: foreignCountryId });

    expect(result).toMatchObject({ needsCountry: true, countries: [{ code: "US" }, { code: "CA" }] });
    expect(await priceIn(latteId, foreignCountryId)).toBeUndefined();
  });
});
