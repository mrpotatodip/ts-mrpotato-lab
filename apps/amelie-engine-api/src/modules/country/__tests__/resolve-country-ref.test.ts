import { beforeAll, describe, expect, it } from "vitest";
import { Effect, Either } from "effect";
import { eq } from "drizzle-orm";
import { tenantCountries } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { resolveCountryRefSvc } from "#/modules/country";
import { createTestDb, insertCountry, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let usId: string;
let caId: string;
let archivedId: string;
let foreignId: string;

const resolve = (ref: string) => Effect.runPromise(Effect.either(resolveCountryRefSvc(db, tenantId, ref)));

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Two Country Cafe", "two-country");
  const [us] = await db.select({ id: tenantCountries.id }).from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId));
  usId = us.id;
  caId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
  archivedId = await insertCountry(db, tenantId, { country: "MX", currency: "MXN", archivedAt: new Date() });
  foreignId = await insertCountry(db, await insertTenant(db, "Other", "other"), { country: "FR", currency: "EUR" });
});

describe("resolveCountryRefSvc", () => {
  it("finds an open Country by id, code or name, any case", async () => {
    for (const ref of [caId, "CA", "ca", "Canada", " canada "]) {
      expect(await resolve(ref)).toMatchObject({ right: { id: caId, code: "CA", name: "Canada", currency: "CAD" } });
    }
    expect(await resolve("united states")).toMatchObject({ right: { id: usId } });
  });

  it("refuses an archived or another Tenant's Country and lists the valid options", async () => {
    for (const ref of [archivedId, "MX", "Mexico", foreignId, "FR", "Atlantis"]) {
      const result = await resolve(ref);
      expect(Either.isLeft(result) && result.left._tag).toBe("NotFound");
      expect(Either.isLeft(result) && result.left.message).toContain("Canada");
      expect(Either.isLeft(result) && result.left.message).toContain("United States");
      expect(Either.isLeft(result) && result.left.message).not.toContain("Mexico");
    }
  });
});
