import { beforeEach, describe, expect, it } from "vitest";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFoundError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import {
  archiveLocationSvc,
  createLocationSvc,
  listLocationsSvc,
  resolveLocationSvc,
  updateLocationSvc,
} from "#/modules/location/handlers";
import { createTestDb, defaultLocationId, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let otherTenantId: string;

beforeEach(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Sorella", "sorella");
  otherTenantId = await insertTenant(db, "Other", "other");
});

describe("createLocationSvc", () => {
  it("adds a Location with a slug from its name and the Tenant's timezone by default", async () => {
    const created = await runEffect(createLocationSvc(db, tenantId, { name: "Airport Terminal 2" }));

    expect(created).toMatchObject({
      name: "Airport Terminal 2",
      slug: "airport-terminal-2",
      address: null,
      phone: null,
      timezone: "America/New_York",
      archivedAt: null,
    });
  });

  it("keeps slugs unique per Tenant, archived Locations included", async () => {
    const first = await runEffect(createLocationSvc(db, tenantId, { name: "Airport" }));
    await runEffect(archiveLocationSvc(db, tenantId, first.id));

    const again = await runEffect(createLocationSvc(db, tenantId, { name: "Airport" }));

    expect(again.slug).toBe("airport-2");
  });

  it("lets two Tenants use the same slug", async () => {
    const mine = await runEffect(createLocationSvc(db, tenantId, { name: "Airport" }));
    const theirs = await runEffect(createLocationSvc(db, otherTenantId, { name: "Airport" }));

    expect(mine.slug).toBe(theirs.slug);
  });

  it("stores the address, phone and timezone it is given", async () => {
    const created = await runEffect(
      createLocationSvc(db, tenantId, {
        name: "Rome",
        address: "Via Roma 1",
        phone: "+39 06 1",
        timezone: "Europe/Rome",
      }),
    );

    expect(created).toMatchObject({ address: "Via Roma 1", phone: "+39 06 1", timezone: "Europe/Rome" });
  });
});

describe("listLocationsSvc", () => {
  it("lists the Tenant's Locations oldest first, archived included, and no other Tenant's", async () => {
    const airport = await runEffect(createLocationSvc(db, tenantId, { name: "Airport" }));
    await runEffect(createLocationSvc(db, otherTenantId, { name: "Elsewhere" }));
    await runEffect(archiveLocationSvc(db, tenantId, airport.id));

    const list = await runEffect(listLocationsSvc(db, tenantId));

    expect(list.map((l) => [l.name, l.archivedAt === null])).toEqual([
      ["Sorella", true],
      ["Airport", false],
    ]);
  });
});

describe("updateLocationSvc", () => {
  it("renames and edits contact details, leaving the slug alone", async () => {
    const id = await defaultLocationId(db, tenantId);

    const updated = await runEffect(
      updateLocationSvc(db, tenantId, id, { name: "Downtown", address: "1 Main St", timezone: "Europe/Rome" }),
    );

    expect(updated).toMatchObject({
      id,
      name: "Downtown",
      slug: "sorella",
      address: "1 Main St",
      timezone: "Europe/Rome",
    });
  });

  it("clears a field sent as null and keeps one left out", async () => {
    const id = await defaultLocationId(db, tenantId);
    await runEffect(updateLocationSvc(db, tenantId, id, { address: "1 Main St", phone: "555" }));

    const updated = await runEffect(updateLocationSvc(db, tenantId, id, { phone: null }));

    expect(updated).toMatchObject({ address: "1 Main St", phone: null });
  });

  it("does not find another Tenant's Location", async () => {
    const theirs = await defaultLocationId(db, otherTenantId);

    await expect(runEffect(updateLocationSvc(db, tenantId, theirs, { name: "Mine now" }))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("does not edit an archived Location", async () => {
    const airport = await runEffect(createLocationSvc(db, tenantId, { name: "Airport" }));
    await runEffect(archiveLocationSvc(db, tenantId, airport.id));

    await expect(runEffect(updateLocationSvc(db, tenantId, airport.id, { name: "X" }))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("archived Locations", () => {
  it("are no longer a Location a request can name", async () => {
    const airport = await runEffect(createLocationSvc(db, tenantId, { name: "Airport" }));
    await runEffect(archiveLocationSvc(db, tenantId, airport.id));

    await expect(runEffect(resolveLocationSvc(db, tenantId, airport.id))).rejects.toBeInstanceOf(NotFoundError);
  });
});
