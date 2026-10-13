import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { tenantCountries, tenantLocations } from "@repo/db-amelie";
import { createTestDb, insertTenant } from "#/__tests__/amelie-test-db";

describe("insertTenant", () => {
  it("creates a US/USD Country by default and puts the default Location in it", async () => {
    const db = await createTestDb();
    const tenantId = await insertTenant(db, "Cafe", "cafe");

    const countries = await db.select().from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId));
    const locations = await db.select().from(tenantLocations).where(eq(tenantLocations.tenantId, tenantId));
    expect(countries).toHaveLength(1);
    expect(countries[0]).toMatchObject({ country: "US", currency: "USD" });
    expect(locations.map((l) => l.countryId)).toEqual([countries[0].id]);
  });

  it("creates the Country from the region argument, also without a Location", async () => {
    const db = await createTestDb();
    const tenantId = await insertTenant(db, "Cafe", "cafe", { country: "CA", currency: "CAD" }, false);

    const countries = await db.select().from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId));
    expect(countries.map((c) => [c.country, c.currency])).toEqual([["CA", "CAD"]]);
    expect(await db.select().from(tenantLocations).where(eq(tenantLocations.tenantId, tenantId))).toHaveLength(0);
  });
});
