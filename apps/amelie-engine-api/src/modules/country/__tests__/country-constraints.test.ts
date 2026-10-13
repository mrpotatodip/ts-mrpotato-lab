import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  chatBotThreadSessions,
  chatBotThreads,
  menuItemPrices,
  tenantCountries,
  tenantFaqs,
  tenantLocations,
  tenantMenuCategories,
  tenantMenuItems,
} from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { createTestDb, insertCountry, insertLocation, insertTenant } from "#/__tests__/amelie-test-db";

const causeChain = (error: Error): string => {
  const messages: string[] = [];
  for (let e: Error | undefined = error; e; e = e.cause instanceof Error ? e.cause : undefined) messages.push(e.message);
  return messages.join(" | ");
};

const refusal = (promise: PromiseLike<unknown>) =>
  Promise.resolve(promise).then(
    () => "accepted",
    (error: Error) => causeChain(error),
  );

describe("Country constraints", () => {
  let db: DbConnectType;
  let tenantA: string;
  let tenantB: string;

  beforeEach(async () => {
    db = await createTestDb();
    tenantA = await insertTenant(db, "Cafe A", "cafe-a");
    tenantB = await insertTenant(db, "Cafe B", "cafe-b");
  });

  const firstCountry = async (tenantId: string) =>
    (await db.select({ id: tenantCountries.id }).from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId)))[0]
      .id;

  const insertItem = async (tenantId: string) => {
    const [category] = await db.insert(tenantMenuCategories).values({ tenantId, name: "Coffee" }).returning();
    const [item] = await db
      .insert(tenantMenuItems)
      .values({ tenantId, categoryId: category.id, name: "Espresso", price: "3.00" })
      .returning();
    return item.id;
  };

  it("refuses a Location that points at another Tenant's Country", async () => {
    const foreign = await insertCountry(db, tenantB, { country: "CA", currency: "CAD" });
    await expect(refusal(
      db.insert(tenantLocations).values({ tenantId: tenantA, name: "X", slug: "x", timezone: "UTC", countryId: foreign }))).resolves.toMatch(/tenant_locations_country_in_tenant_fk/);
  });

  it("accepts a Location in its own Tenant's Country", async () => {
    const own = await insertCountry(db, tenantA, { country: "CA", currency: "CAD" });
    const id = await insertLocation(db, tenantA, { name: "Y", slug: "y", countryId: own });
    const [row] = await db.select().from(tenantLocations).where(eq(tenantLocations.id, id));
    expect(row.countryId).toBe(own);
  });

  it("allows one Country per code per Tenant, archived or not, but the same code in another Tenant", async () => {
    await insertCountry(db, tenantA, { country: "CA", currency: "CAD", archivedAt: new Date() });
    await expect(refusal(insertCountry(db, tenantA, { country: "CA", currency: "CAD" }))).resolves.toMatch(/uq_tenant_countries_tenant_country/);
    await expect(insertCountry(db, tenantB, { country: "CA", currency: "CAD" })).resolves.toBeTruthy();
  });

  it("refuses a malformed country or currency code", async () => {
    await expect(refusal(insertCountry(db, tenantA, { country: "can", currency: "CAD" }))).resolves.toMatch(/tenant_countries_country_format/);
    await expect(refusal(insertCountry(db, tenantA, { country: "CA", currency: "cad" }))).resolves.toMatch(/tenant_countries_currency_format/);
  });

  it("refuses a price row whose item and Country belong to different Tenants", async () => {
    const itemA = await insertItem(tenantA);
    const countryB = await firstCountry(tenantB);
    await expect(refusal(
      db.insert(menuItemPrices).values({ tenantId: tenantA, menuItemId: itemA, countryId: countryB, price: "1.00" }))).resolves.toMatch(/menu_item_prices_country_in_tenant_fk/);
    const countryA = await firstCountry(tenantA);
    await expect(refusal(
      db.insert(menuItemPrices).values({ tenantId: tenantB, menuItemId: itemA, countryId: countryA, price: "1.00" }))).resolves.toMatch(/menu_item_prices_(item|country)_in_tenant_fk/);
  });

  it("gives a price row is_sold true by default and allows one price per item per Country", async () => {
    const item = await insertItem(tenantA);
    const country = await firstCountry(tenantA);
    const [row] = await db
      .insert(menuItemPrices)
      .values({ tenantId: tenantA, menuItemId: item, countryId: country, price: "2.50" })
      .returning();
    expect(row.isSold).toBe(true);
    await expect(refusal(
      db.insert(menuItemPrices).values({ tenantId: tenantA, menuItemId: item, countryId: country, price: "3.00" }))).resolves.toMatch(/duplicate key|menu_item_prices_pkey/);
  });

  it("lets an FAQ have a Country or a Location, never both", async () => {
    const country = await firstCountry(tenantA);
    const location = await insertLocation(db, tenantA, { name: "Z", slug: "z", countryId: country });
    const faq = { tenantId: tenantA, question: "Q?", answer: "A." };
    await expect(db.insert(tenantFaqs).values({ ...faq, countryId: country })).resolves.toBeDefined();
    await expect(db.insert(tenantFaqs).values({ ...faq, locationId: location })).resolves.toBeDefined();
    await expect(db.insert(tenantFaqs).values(faq)).resolves.toBeDefined();
    await expect(refusal(db.insert(tenantFaqs).values({ ...faq, countryId: country, locationId: location }))).resolves.toMatch(/tenant_faqs_country_or_location/);
  });

  it("refuses an FAQ that points at another Tenant's Country", async () => {
    const countryB = await firstCountry(tenantB);
    await expect(refusal(
      db.insert(tenantFaqs).values({ tenantId: tenantA, question: "Q?", answer: "A.", countryId: countryB }))).resolves.toMatch(/tenant_faqs_country_in_tenant_fk/);
  });

  it("refuses a Thread session that points at another Tenant's Country", async () => {
    const countryB = await firstCountry(tenantB);
    const [thread] = await db.insert(chatBotThreads).values({}).returning();
    await expect(refusal(
      db
        .insert(chatBotThreadSessions)
        .values({ threadId: thread.id, tenantId: tenantA, anonymousId: "anon", expiresAt: new Date(), countryId: countryB }))).resolves.toMatch(/fk_chat_bot_thread_sessions_country_tenant/);
  });
});
