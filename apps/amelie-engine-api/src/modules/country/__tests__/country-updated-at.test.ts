import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { menuItemPrices, tenantCountries } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { addCountrySvc, archiveCountrySvc, updateCountryCurrencySvc } from "#/modules/country";
import { addMenuCategorySvc, addMenuItemSvc, updateMenuItemSvc } from "#/modules/menu";
import { updateTenantRegionSvc } from "#/modules/tenant/handlers";
import { createTestDb, insertMember, insertPersonWithLogin, insertTenant } from "#/__tests__/amelie-test-db";

// -----
// Migration 0026 treats a row whose updated_at still
// equals created_at as never written since the backfill.
// So every write the new code makes must move updated_at.
// -----
let db: DbConnectType;
let tenantId: string;

const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 5));

const countryRows = () => db.select().from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId));

const touched = (row: { createdAt: Date; updatedAt: Date }) => row.updatedAt.getTime() > row.createdAt.getTime();

beforeEach(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Sorella", "sorella");
});

describe("writes by the new code move updated_at", () => {
  it("editing a Country's currency", async () => {
    const [us] = await countryRows();
    await pause();

    await runEffect(updateCountryCurrencySvc(db, tenantId, us.id, "CAD"));

    expect(touched((await countryRows())[0])).toBe(true);
  });

  it("archiving a Country", async () => {
    const ca = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));
    await pause();

    await runEffect(archiveCountrySvc(db, tenantId, ca.id));

    const row = (await countryRows()).find((r) => r.id === ca.id);
    expect(row && touched(row)).toBe(true);
  });

  it("the Region edit", async () => {
    const login = await insertPersonWithLogin(db, "owner@sorella.test");
    await insertMember(db, tenantId, login.partyId, "owner");
    await pause();

    await runEffect(updateTenantRegionSvc(db, login.userId, tenantId, { country: "CA", currency: "CAD" }));

    expect(touched((await countryRows())[0])).toBe(true);
  });

  it("editing a menu item's price", async () => {
    const category = await runEffect(addMenuCategorySvc(db, tenantId, { name: "Bakery", note: null }));
    const input = {
      categoryId: category.id,
      name: "Muffin",
      description: null,
      price: "4.00",
      variants: null,
      isAvailable: true,
      dietaryTags: [],
    };
    const muffin = await runEffect(addMenuItemSvc(db, tenantId, input));
    await pause();

    await runEffect(updateMenuItemSvc(db, tenantId, muffin.id, { ...input, price: "4.50" }));

    const [row] = await db.select().from(menuItemPrices).where(eq(menuItemPrices.menuItemId, muffin.id));
    expect(touched(row)).toBe(true);
  });
});
