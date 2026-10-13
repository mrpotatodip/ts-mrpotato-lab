import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { getBusinessProfileSvc, updateBusinessProfileSvc } from "#/modules/business-profile";
import { createTestDb, defaultLocationId, insertLocation, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let otherCafeId: string;

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella");
  otherCafeId = await insertTenant(db, "Other Cafe", "other-cafe");
});

describe("business profile", () => {
  it("reads as empty before the Tenant sets anything", async () => {
    expect(await runEffect(getBusinessProfileSvc(db, sorellaId))).toEqual({
      description: null,
      websiteUrl: null,
      phone: null,
      email: null,
      address: null,
    });
  });

  it("creates the profile on the first change, then changes only named fields", async () => {
    await runEffect(updateBusinessProfileSvc(db, sorellaId, { phone: "845-871-2010", address: "992 Main St" }));
    const after = await runEffect(updateBusinessProfileSvc(db, sorellaId, { phone: "845-000-0000" }));

    expect(after).toMatchObject({ phone: "845-000-0000", address: "992 Main St" });
  });

  it("clears a field sent as null, and keeps one left out", async () => {
    await runEffect(updateBusinessProfileSvc(db, sorellaId, { phone: "845-871-2010", email: "hello@sorella.test" }));

    await runEffect(updateBusinessProfileSvc(db, sorellaId, { phone: null }));
    const profile = await runEffect(getBusinessProfileSvc(db, sorellaId));

    expect(profile.phone).toBeNull();
    expect(profile.email).toBe("hello@sorella.test");
  });

  it("never shows one Tenant's profile to another", async () => {
    expect(await runEffect(getBusinessProfileSvc(db, otherCafeId))).toMatchObject({ phone: null, address: null });
  });
});

describe("business profile of a Tenant with two Locations", () => {
  let tenantId: string;
  let downtownId: string;
  let airportId: string;

  beforeAll(async () => {
    tenantId = await insertTenant(db, "Two Branch Cafe", "two-branch");
    downtownId = await defaultLocationId(db, tenantId);
    airportId = await insertLocation(db, tenantId, {
      name: "Airport",
      slug: "airport",
      address: "Terminal 2",
      phone: "555-0002",
    });
    await runEffect(updateBusinessProfileSvc(db, tenantId, { phone: "555-0001", address: "1 Main St" }, downtownId));
    await runEffect(updateBusinessProfileSvc(db, tenantId, { email: "hello@two.test", description: "Both branches" }));
  });

  it("reads address and phone from the Location and the rest from the Tenant", async () => {
    const downtown = await runEffect(getBusinessProfileSvc(db, tenantId, downtownId));
    const airport = await runEffect(getBusinessProfileSvc(db, tenantId, airportId));

    expect(downtown).toMatchObject({ address: "1 Main St", phone: "555-0001", email: "hello@two.test" });
    expect(airport).toMatchObject({ address: "Terminal 2", phone: "555-0002", description: "Both branches" });
  });

  it("changes a Location's contact details without touching the other Location", async () => {
    await runEffect(updateBusinessProfileSvc(db, tenantId, { phone: "555-9999" }, airportId));

    expect(await runEffect(getBusinessProfileSvc(db, tenantId, airportId))).toMatchObject({ phone: "555-9999" });
    expect(await runEffect(getBusinessProfileSvc(db, tenantId, downtownId))).toMatchObject({ phone: "555-0001" });
  });

  it("asks which Location when none is given, listing the options", async () => {
    const failure = await Effect.runPromise(Effect.flip(getBusinessProfileSvc(db, tenantId)));

    expect(failure).toMatchObject({ _tag: "NeedsLocation" });
    expect(failure).toHaveProperty("locations", [
      { id: downtownId, name: "Two Branch Cafe" },
      { id: airportId, name: "Airport" },
    ]);
  });

  it("needs a Location only when the change touches address or phone", async () => {
    await runEffect(updateBusinessProfileSvc(db, tenantId, { websiteUrl: "https://two.test" }));
    const failure = await Effect.runPromise(Effect.flip(updateBusinessProfileSvc(db, tenantId, { phone: "555-1234" })));

    expect(failure).toMatchObject({ _tag: "NeedsLocation" });
  });

  it("does not accept another Tenant's Location", async () => {
    const foreign = await defaultLocationId(db, otherCafeId);

    const failure = await Effect.runPromise(Effect.flip(getBusinessProfileSvc(db, tenantId, foreign)));

    expect(failure).toMatchObject({ _tag: "NotFound" });
  });
});
