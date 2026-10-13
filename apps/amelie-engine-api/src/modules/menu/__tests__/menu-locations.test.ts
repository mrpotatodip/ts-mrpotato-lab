import { beforeAll, describe, expect, it } from "vitest";
import { MenuItemLocationsBodySchema } from "@repo/contracts/amelie";
import { tenantMenuCategories, tenantMenuItemLocations } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFoundError, ValidationError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import { MENU_LOCATIONS_REQUIRED } from "#/modules/menu/constants";
import {
  getMenuEditorSvc,
  listMenuSvc,
  searchMenuSvc,
  setMenuItemLocationsSvc,
} from "#/modules/menu";
import { MENU_LOCATION_NOT_FOUND } from "#/modules/menu/constants";
import { createTestDb, defaultLocationId, insertLocation, insertMenuItems, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let otherTenantId: string;
let downtownId: string;
let airportId: string;
let otherLocationId: string;
let latteId: string;
let sandwichId: string;
let otherItemId: string;

const namesAt = async (locationId?: string) =>
  (await runEffect(listMenuSvc(db, tenantId, locationId))).flatMap((c) => c.items.map((i) => i.name)).toSorted();

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Sorella", "sorella");
  otherTenantId = await insertTenant(db, "Other", "other");
  downtownId = await defaultLocationId(db, tenantId);
  airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
  otherLocationId = await defaultLocationId(db, otherTenantId);
  const [category] = await db.insert(tenantMenuCategories).values({ tenantId, name: "Menu" }).returning();
  const [otherCategory] = await db
    .insert(tenantMenuCategories)
    .values({ tenantId: otherTenantId, name: "Menu" })
    .returning();
  [{ id: latteId }, { id: sandwichId }] = await insertMenuItems(db, tenantId, [
      { categoryId: category.id, name: "Iced Latte", price: "5" },
      { categoryId: category.id, name: "Airport Sandwich", price: "8" },
    ]);
  [{ id: otherItemId }] = await insertMenuItems(db, otherTenantId, [{ categoryId: otherCategory.id, name: "Secret Burger", price: "9" }]);
});

describe("tenant_menu_item_locations", () => {
  it("rejects a row joining an item to another Tenant's Location", async () => {
    await expect(
      db
        .insert(tenantMenuItemLocations)
        .values({ tenantId, menuItemId: latteId, locationId: otherLocationId, isAvailable: false }),
    ).rejects.toMatchObject({ cause: { constraint: "tenant_menu_item_locations_location_in_tenant_fk" } });
  });

  it("rejects a row joining a Location to another Tenant's item", async () => {
    await expect(
      db
        .insert(tenantMenuItemLocations)
        .values({ tenantId, menuItemId: otherItemId, locationId: downtownId, isAvailable: false }),
    ).rejects.toMatchObject({ cause: { constraint: "tenant_menu_item_locations_item_in_tenant_fk" } });
  });

  it("defaults a new item to sold at all Locations", async () => {
    const editor = await runEffect(getMenuEditorSvc(db, tenantId));

    expect(editor.categories[0].items).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Iced Latte", availableAtAllLocations: true, locationIds: [] })]),
    );
  });
});

describe("setMenuItemLocationsSvc", () => {
  it("sells out an all-Locations item at the chosen Locations only", async () => {
    await runEffect(setMenuItemLocationsSvc(db, tenantId, latteId, { availableAtAllLocations: true, locationIds: [downtownId] }));

    expect(await namesAt(downtownId)).not.toContain("Iced Latte");
    expect(await namesAt(airportId)).toContain("Iced Latte");
  });

  it("returns the item with its flag and Locations", async () => {
    const item = await runEffect(
      setMenuItemLocationsSvc(db, tenantId, latteId, { availableAtAllLocations: true, locationIds: [downtownId, airportId] }),
    );

    expect(item).toMatchObject({ id: latteId, availableAtAllLocations: true, locationIds: expect.arrayContaining([downtownId, airportId]) });
  });

  it("puts an item back on sale by clearing the sold-out Locations", async () => {
    await runEffect(setMenuItemLocationsSvc(db, tenantId, latteId, { availableAtAllLocations: true, locationIds: [] }));

    expect(await namesAt(downtownId)).toContain("Iced Latte");
    expect(await namesAt(airportId)).toContain("Iced Latte");
  });

  it("sells an item only at the chosen Locations, replacing earlier sold-out rows", async () => {
    await runEffect(setMenuItemLocationsSvc(db, tenantId, sandwichId, { availableAtAllLocations: true, locationIds: [downtownId] }));
    await runEffect(setMenuItemLocationsSvc(db, tenantId, sandwichId, { availableAtAllLocations: false, locationIds: [airportId] }));
    const laterId = await insertLocation(db, tenantId, { name: "Harbour", slug: "harbour" });

    expect(await namesAt(airportId)).toContain("Airport Sandwich");
    expect(await namesAt(downtownId)).not.toContain("Airport Sandwich");
    expect(await namesAt(laterId)).not.toContain("Airport Sandwich");
    expect(await namesAt()).toContain("Airport Sandwich");
  });

  it("reads the same Locations back from the editor", async () => {
    const items = (await runEffect(getMenuEditorSvc(db, tenantId))).categories.flatMap((c) => c.items);

    expect(items.find((i) => i.id === sandwichId)).toMatchObject({
      availableAtAllLocations: false,
      locationIds: [airportId],
    });
  });

  it("refuses a not-everywhere item with no Locations, which would hide it everywhere", async () => {
    await expect(
      runEffect(setMenuItemLocationsSvc(db, tenantId, latteId, { availableAtAllLocations: false, locationIds: [] })),
    ).rejects.toEqual(new ValidationError(MENU_LOCATIONS_REQUIRED));
  });

  it("refuses another Tenant's Location or item", async () => {
    await expect(
      runEffect(setMenuItemLocationsSvc(db, tenantId, latteId, { availableAtAllLocations: true, locationIds: [otherLocationId] })),
    ).rejects.toEqual(new NotFoundError(MENU_LOCATION_NOT_FOUND));
    await expect(
      runEffect(setMenuItemLocationsSvc(db, tenantId, otherItemId, { availableAtAllLocations: true, locationIds: [downtownId] })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("searchMenuSvc at a Location", () => {
  it("only finds items shown at that Location", async () => {
    const atDowntown = await runEffect(searchMenuSvc(db, tenantId, { text: "sandwich", dietaryTag: null }, downtownId));
    const atAirport = await runEffect(searchMenuSvc(db, tenantId, { text: "sandwich", dietaryTag: null }, airportId));
    const tenantWide = await runEffect(searchMenuSvc(db, tenantId, { text: "sandwich", dietaryTag: null }));

    expect(atDowntown).toEqual([]);
    expect(atAirport.map((i) => i.name)).toEqual(["Airport Sandwich"]);
    expect(tenantWide.map((i) => i.name)).toEqual(["Airport Sandwich"]);
  });
});

describe("getMenuEditorSvc at a Location", () => {
  it("lists only what is shown at the Location, using the same rule as the bot", async () => {
    const atDowntown = await runEffect(getMenuEditorSvc(db, tenantId, downtownId));
    const names = atDowntown.categories.flatMap((c) => c.items.map((i) => i.name));

    expect(names).toEqual(await namesAt(downtownId));
    expect(names).not.toContain("Airport Sandwich");
  });

  it("refuses another Tenant's Location", async () => {
    await expect(runEffect(getMenuEditorSvc(db, tenantId, otherLocationId))).rejects.toEqual(
      new NotFoundError(MENU_LOCATION_NOT_FOUND),
    );
  });
});

describe("MenuItemLocationsBodySchema", () => {
  it("needs at least one Location when the item is sold only at chosen Locations", () => {
    expect(MenuItemLocationsBodySchema.safeParse({ availableAtAllLocations: false, locationIds: [] }).success).toBe(false);
    expect(MenuItemLocationsBodySchema.safeParse({ availableAtAllLocations: true, locationIds: [] }).success).toBe(true);
  });
});
