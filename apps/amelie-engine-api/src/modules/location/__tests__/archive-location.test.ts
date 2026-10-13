import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { tenantLocations, tenantMenuCategories, tenantMenuItemLocations } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { ConflictError, NotFoundError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import { archiveLocationSvc } from "#/modules/location/handlers";
import { createTestDb, insertLocation, insertMenuItems, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let otherTenantId: string;

const addLocation = (forTenant: string, slug: string) => insertLocation(db, forTenant, { name: slug, slug });

const archivedAtOf = async (id: string) =>
  (await db.select().from(tenantLocations).where(eq(tenantLocations.id, id)))[0].archivedAt;

beforeEach(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Sorella", "sorella", undefined, false);
  otherTenantId = await insertTenant(db, "Other", "other", undefined, false);
});

describe("archiving a Location", () => {
  it("archives one of two active Locations and keeps the row", async () => {
    const downtown = await addLocation(tenantId, "downtown");
    await addLocation(tenantId, "airport");

    await runEffect(archiveLocationSvc(db, tenantId, downtown));

    expect(await archivedAtOf(downtown)).toBeInstanceOf(Date);
  });

  it("refuses to archive the last active Location", async () => {
    const only = await addLocation(tenantId, "downtown");

    const attempt = runEffect(archiveLocationSvc(db, tenantId, only));

    await expect(attempt).rejects.toBeInstanceOf(ConflictError);
    expect(await archivedAtOf(only)).toBeNull();
  });

  it("refuses the second archive once only one active Location is left", async () => {
    const downtown = await addLocation(tenantId, "downtown");
    const airport = await addLocation(tenantId, "airport");
    await runEffect(archiveLocationSvc(db, tenantId, downtown));

    await expect(runEffect(archiveLocationSvc(db, tenantId, airport))).rejects.toBeInstanceOf(ConflictError);
    expect(await archivedAtOf(airport)).toBeNull();
  });

  it("does not count another Tenant's Locations as a spare", async () => {
    const only = await addLocation(tenantId, "downtown");
    await addLocation(otherTenantId, "airport");

    await expect(runEffect(archiveLocationSvc(db, tenantId, only))).rejects.toBeInstanceOf(ConflictError);
  });

  it("answers not found for a Location of another Tenant or an already archived one", async () => {
    const downtown = await addLocation(tenantId, "downtown");
    await addLocation(tenantId, "airport");
    const foreign = await addLocation(otherTenantId, "airport");
    await runEffect(archiveLocationSvc(db, tenantId, downtown));

    await expect(runEffect(archiveLocationSvc(db, tenantId, foreign))).rejects.toBeInstanceOf(NotFoundError);
    await expect(runEffect(archiveLocationSvc(db, tenantId, downtown))).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("archiving a Location that sells a menu item", () => {
  const addItem = async (name: string, availableAtAllLocations: boolean, sellsAt: string[]) => {
    const [category] = await db.insert(tenantMenuCategories).values({ tenantId, name: `Menu ${name}` }).returning();
    const [item] = await insertMenuItems(db, tenantId, [{ categoryId: category.id, name, price: "5", availableAtAllLocations }]);
    if (sellsAt.length > 0) {
      await db
        .insert(tenantMenuItemLocations)
        .values(sellsAt.map((locationId) => ({ tenantId, menuItemId: item.id, locationId, isAvailable: true })));
    }
    return item.id;
  };

  it("reports the items that were sold only there, and not the ones sold elsewhere too or everywhere", async () => {
    const downtown = await addLocation(tenantId, "downtown");
    const airport = await addLocation(tenantId, "airport");
    const soleItem = await addItem("Airport Sandwich", false, [airport]);
    await addItem("Shared Pastry", false, [airport, downtown]);
    await addItem("Everywhere Latte", true, []);
    await addItem("Downtown Only", false, [downtown]);

    const unsold = await runEffect(archiveLocationSvc(db, tenantId, airport));

    expect(unsold).toEqual([{ id: soleItem, name: "Airport Sandwich" }]);
  });

  it("counts an already archived Location as no longer selling", async () => {
    const downtown = await addLocation(tenantId, "downtown");
    const airport = await addLocation(tenantId, "airport");
    const harbor = await addLocation(tenantId, "harbor");
    await runEffect(archiveLocationSvc(db, tenantId, downtown));
    const item = await addItem("Downtown And Airport", false, [downtown, airport]);

    const unsold = await runEffect(archiveLocationSvc(db, tenantId, airport));

    expect(unsold).toEqual([{ id: item, name: "Downtown And Airport" }]);
    expect(await archivedAtOf(harbor)).toBeNull();
  });

  it("reports nothing when no item is left unsold", async () => {
    const downtown = await addLocation(tenantId, "downtown");
    await addLocation(tenantId, "airport");

    expect(await runEffect(archiveLocationSvc(db, tenantId, downtown))).toEqual([]);
  });
});
