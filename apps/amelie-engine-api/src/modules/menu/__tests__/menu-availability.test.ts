import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { tenantMenuCategories, tenantMenuItemLocations } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { listMenuEffect } from "#/modules/menu/queries";
import { createTestDb, defaultLocationId, insertLocation, insertMenuItems, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let downtownId: string;
let airportId: string;
let categoryId: string;

type Row = { isAvailable: boolean; atAll: boolean; row: "none" | "sold-out" | "available" };

const addItem = async (name: string, { isAvailable, atAll, row }: Row, locationId = downtownId) => {
  const [item] = await insertMenuItems(db, tenantId, [{ categoryId, name, price: "5", isAvailable, availableAtAllLocations: atAll }]);
  if (row !== "none") {
    await db
      .insert(tenantMenuItemLocations)
      .values({ tenantId, menuItemId: item.id, locationId, isAvailable: row === "available" });
  }
  return item.id;
};

const shownAt = async (locationId: string | undefined) => {
  const menu = await Effect.runPromise(listMenuEffect(db, tenantId, locationId));
  return menu.flatMap((category) => category.items.map((item) => item.name)).toSorted();
};

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Sorella", "sorella");
  downtownId = await defaultLocationId(db, tenantId);
  airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
  const [category] = await db.insert(tenantMenuCategories).values({ tenantId, name: "Menu" }).returning();
  categoryId = category.id;
});

describe("menu availability truth table (ADR-0001)", () => {
  it("hides an item that is not available overall, whatever the flag and row", async () => {
    await addItem("T1 off none", { isAvailable: false, atAll: true, row: "none" });
    await addItem("T1 off sold-out", { isAvailable: false, atAll: true, row: "sold-out" });
    await addItem("T1 off only-here none", { isAvailable: false, atAll: false, row: "none" });
    await addItem("T1 off only-here available", { isAvailable: false, atAll: false, row: "available" });

    expect((await shownAt(downtownId)).filter((name) => name.startsWith("T1"))).toEqual([]);
  });

  it("shows an all-Locations item with no row", async () => {
    await addItem("T2 everywhere", { isAvailable: true, atAll: true, row: "none" });

    expect(await shownAt(downtownId)).toContain("T2 everywhere");
  });

  it("hides an all-Locations item with a sold-out row", async () => {
    await addItem("T3 sold out here", { isAvailable: true, atAll: true, row: "sold-out" });

    expect(await shownAt(downtownId)).not.toContain("T3 sold out here");
  });

  it("hides a chosen-Locations item with no row", async () => {
    await addItem("T4 not sold here", { isAvailable: true, atAll: false, row: "none" });

    expect(await shownAt(downtownId)).not.toContain("T4 not sold here");
  });

  it("shows a chosen-Locations item with an available row", async () => {
    await addItem("T5 sold only here", { isAvailable: true, atAll: false, row: "available" });

    expect(await shownAt(downtownId)).toContain("T5 sold only here");
  });

  it("hides a chosen-Locations item whose row says unavailable", async () => {
    await addItem("T6 chosen but off", { isAvailable: true, atAll: false, row: "sold-out" });

    expect(await shownAt(downtownId)).not.toContain("T6 chosen but off");
  });
});

describe("menu availability across Locations", () => {
  it("keeps Iced Latte at Airport when Downtown sold out", async () => {
    await addItem("Iced Latte", { isAvailable: true, atAll: true, row: "sold-out" }, downtownId);

    expect(await shownAt(downtownId)).not.toContain("Iced Latte");
    expect(await shownAt(airportId)).toContain("Iced Latte");
  });

  it("never shows an Airport-only item at Downtown, nor at a Location created later", async () => {
    await addItem("Airport Sandwich", { isAvailable: true, atAll: false, row: "available" }, airportId);
    const laterId = await insertLocation(db, tenantId, { name: "Harbour", slug: "harbour" });

    expect(await shownAt(airportId)).toContain("Airport Sandwich");
    expect(await shownAt(downtownId)).not.toContain("Airport Sandwich");
    expect(await shownAt(laterId)).not.toContain("Airport Sandwich");
  });

  it("hides an unavailable item (Pumpkin Soup) everywhere", async () => {
    await addItem("Pumpkin Soup", { isAvailable: false, atAll: true, row: "none" });

    expect(await shownAt(downtownId)).not.toContain("Pumpkin Soup");
    expect(await shownAt(airportId)).not.toContain("Pumpkin Soup");
  });

  it("applies no availability rows when no Location is given", async () => {
    const all = await shownAt(undefined);

    expect(all).toEqual(
      expect.arrayContaining(["Iced Latte", "Airport Sandwich", "T3 sold out here", "T4 not sold here"]),
    );
  });
});
