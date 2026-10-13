import { beforeEach, describe, expect, it } from "vitest";
import { Effect, Either } from "effect";
import { UpdateLocationBodySchema } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { addCountrySvc, archiveCountrySvc } from "#/modules/country";
import { COUNTRY_REQUIRED } from "#/modules/country/constants";
import { createLocationSvc, listLocationsSvc, updateLocationSvc } from "#/modules/location/handlers";
import { createTestDb, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let otherTenantId: string;

const failure = async <A, E>(effect: Effect.Effect<A, E>) => {
  const result = await Effect.runPromise(Effect.either(effect));
  if (Either.isRight(result)) throw new Error("expected a failure");
  return result.left;
};

beforeEach(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Sorella", "sorella");
  otherTenantId = await insertTenant(db, "Other", "other", { country: "FR", currency: "EUR" });
});

describe("the Country of a new Location", () => {
  it("defaults to the only Country when the cafe has one", async () => {
    const [existing] = await runEffect(listLocationsSvc(db, tenantId));

    const created = await runEffect(createLocationSvc(db, tenantId, { name: "Airport" }));

    expect(created.countryId).toBe(existing.countryId);
  });

  it("is required once the cafe has two open Countries", async () => {
    await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));

    const error = await failure(createLocationSvc(db, tenantId, { name: "Airport" }));

    expect(error).toMatchObject({ _tag: "Invalid", message: COUNTRY_REQUIRED });
  });

  it("is the Country the body names", async () => {
    const ca = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));

    const created = await runEffect(createLocationSvc(db, tenantId, { name: "Toronto", countryId: ca.id }));

    expect(created.countryId).toBe(ca.id);
  });

  it("must be an open Country of this cafe", async () => {
    const ca = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));
    await runEffect(archiveCountrySvc(db, tenantId, ca.id));
    const [foreign] = await runEffect(listLocationsSvc(db, otherTenantId));

    for (const countryId of [ca.id, foreign.countryId]) {
      const error = await failure(createLocationSvc(db, tenantId, { name: "Toronto", countryId }));
      expect(error._tag).toBe("NotFound");
    }
  });

  it("never changes after creation: an edit that names a Country leaves it", async () => {
    const ca = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));
    const toronto = await runEffect(createLocationSvc(db, tenantId, { name: "Toronto", countryId: ca.id }));
    const [us] = await runEffect(listLocationsSvc(db, tenantId));

    const change = UpdateLocationBodySchema.parse({ name: "Toronto East", countryId: us.countryId });
    const updated = await runEffect(updateLocationSvc(db, tenantId, toronto.id, change));

    expect(updated).toMatchObject({ name: "Toronto East", countryId: ca.id });
  });
});

describe("the timezone of a new Location", () => {
  it("starts from the last Location created in that Country", async () => {
    const ca = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));
    await runEffect(createLocationSvc(db, tenantId, { name: "Vancouver", countryId: ca.id, timezone: "America/Vancouver" }));
    await runEffect(createLocationSvc(db, tenantId, { name: "Toronto", countryId: ca.id, timezone: "America/Toronto" }));

    const created = await runEffect(createLocationSvc(db, tenantId, { name: "Montreal", countryId: ca.id }));

    expect(created.timezone).toBe("America/Toronto");
  });

  it("falls back to the cafe's when the Country has no Location yet", async () => {
    const ca = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));

    const created = await runEffect(createLocationSvc(db, tenantId, { name: "Toronto", countryId: ca.id }));

    expect(created.timezone).toBe("America/New_York");
  });

  it("ignores Locations of other Countries, and stays editable", async () => {
    const ca = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));
    await runEffect(createLocationSvc(db, tenantId, { name: "Toronto", countryId: ca.id, timezone: "America/Toronto" }));
    const [us] = await runEffect(listLocationsSvc(db, tenantId));

    const inUs = await runEffect(createLocationSvc(db, tenantId, { name: "Airport", countryId: us.countryId }));
    const explicit = await runEffect(
      createLocationSvc(db, tenantId, { name: "Calgary", countryId: ca.id, timezone: "America/Edmonton" }),
    );

    expect(inUs.timezone).toBe("America/New_York");
    expect(explicit.timezone).toBe("America/Edmonton");
  });
});
