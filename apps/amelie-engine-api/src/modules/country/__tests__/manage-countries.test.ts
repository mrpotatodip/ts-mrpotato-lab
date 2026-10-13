import { beforeEach, describe, expect, it } from "vitest";
import { Effect, Either } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { addCountrySvc, archiveCountrySvc, listCountriesSvc, updateCountryCurrencySvc } from "#/modules/country";
import { COUNTRY_HAS_LOCATIONS, COUNTRY_LAST_OPEN } from "#/modules/country/constants";
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

describe("addCountrySvc and listCountriesSvc", () => {
  it("adds a Country and lists it after the first, oldest first", async () => {
    const added = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));

    expect(added).toMatchObject({ country: "CA", currency: "CAD", archivedAt: null });
    const all = await runEffect(listCountriesSvc(db, tenantId));
    expect(all.map((c) => c.country)).toEqual(["US", "CA"]);
  });

  it("lists archived Countries too, with their archive date", async () => {
    const ca = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));
    await runEffect(archiveCountrySvc(db, tenantId, ca.id));

    const all = await runEffect(listCountriesSvc(db, tenantId));

    expect(all.find((c) => c.id === ca.id)?.archivedAt).toEqual(expect.any(String));
  });

  it("refuses a second open row for the same country code", async () => {
    await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));

    const error = await failure(addCountrySvc(db, tenantId, { country: "CA", currency: "USD" }));

    expect(error._tag).toBe("Conflict");
  });

  it("lets two Tenants sell in the same country", async () => {
    await runEffect(addCountrySvc(db, tenantId, { country: "FR", currency: "EUR" }));

    expect(await runEffect(listCountriesSvc(db, tenantId))).toHaveLength(2);
    expect(await runEffect(listCountriesSvc(db, otherTenantId))).toHaveLength(1);
  });

  it("restores an archived Country row, same id, instead of adding a second", async () => {
    const ca = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));
    await runEffect(archiveCountrySvc(db, tenantId, ca.id));

    const again = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));

    expect(again).toMatchObject({ id: ca.id, archivedAt: null });
    expect(await runEffect(listCountriesSvc(db, tenantId))).toHaveLength(2);
  });
});

describe("updateCountryCurrencySvc", () => {
  it("changes the currency and keeps the code", async () => {
    const ca = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));

    const updated = await runEffect(updateCountryCurrencySvc(db, tenantId, ca.id, "USD"));

    expect(updated).toMatchObject({ id: ca.id, country: "CA", currency: "USD" });
  });

  it("does not find another Tenant's or an archived Country", async () => {
    const [foreign] = await runEffect(listCountriesSvc(db, otherTenantId));
    const ca = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));
    await runEffect(archiveCountrySvc(db, tenantId, ca.id));

    expect((await failure(updateCountryCurrencySvc(db, tenantId, foreign.id, "USD")))._tag).toBe("NotFound");
    expect((await failure(updateCountryCurrencySvc(db, tenantId, ca.id, "USD")))._tag).toBe("NotFound");
  });
});

describe("archiveCountrySvc", () => {
  it("archives a Country with no open Locations", async () => {
    const ca = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));

    const archived = await runEffect(archiveCountrySvc(db, tenantId, ca.id));

    expect(archived).toEqual({ id: ca.id });
  });

  it("refuses to archive the last open Country, with a clear message", async () => {
    const [us] = await runEffect(listCountriesSvc(db, tenantId));

    const error = await failure(archiveCountrySvc(db, tenantId, us.id));

    expect(error).toMatchObject({ _tag: "Conflict", message: COUNTRY_LAST_OPEN });
  });

  it("refuses to archive a Country that still has open Locations", async () => {
    const [us] = await runEffect(listCountriesSvc(db, tenantId));
    await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));

    const error = await failure(archiveCountrySvc(db, tenantId, us.id));

    expect(error).toMatchObject({ _tag: "Conflict", message: COUNTRY_HAS_LOCATIONS });
  });

  it("does not find another Tenant's Country", async () => {
    const [foreign] = await runEffect(listCountriesSvc(db, otherTenantId));

    expect((await failure(archiveCountrySvc(db, tenantId, foreign.id)))._tag).toBe("NotFound");
  });
});
