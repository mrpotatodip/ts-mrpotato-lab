import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { partyRoles, partyRoleScopes, tenantCountries, tenantLocations } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFoundError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import { archiveLocationPreviewSvc, archiveLocationSvc } from "#/modules/location/handlers";
import {
  createTestDb,
  defaultLocationId,
  insertCountry,
  insertLocation,
  insertMember,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let downtownId: string;
let airportId: string;

const addMember = async (email: string, role = "store_staff") => {
  const { partyId } = await insertPersonWithLogin(db, email);
  await insertMember(db, tenantId, partyId, role);
  return partyId;
};
const bind = async (partyId: string, target: { countryId: string } | { locationId: string }) => {
  const [member] = await db.select({ id: partyRoles.id }).from(partyRoles).where(eq(partyRoles.partyId, partyId));
  await db.insert(partyRoleScopes).values({ tenantId, partyRoleId: member.id, ...target });
};
const affectedEmails = async (locationId: string) =>
  (await runEffect(archiveLocationPreviewSvc(db, tenantId, locationId))).membersWithoutLocation
    .map((member) => member.email)
    .toSorted();

beforeEach(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Sorella", "sorella");
  downtownId = await defaultLocationId(db, tenantId);
  airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
});

describe("previewing the archive of a Location", () => {
  it("names a member whose only open Location is this one, with name and email", async () => {
    const priya = await addMember("priya@example.com");
    await bind(priya, { locationId: airportId });

    const preview = await runEffect(archiveLocationPreviewSvc(db, tenantId, airportId));

    expect(preview.id).toBe(airportId);
    expect(preview.membersWithoutLocation).toEqual([
      { partyId: priya, name: "Test priya@example.com", email: "priya@example.com" },
    ]);
  });

  it("leaves out a member who keeps another open Location", async () => {
    const priya = await addMember("priya@example.com");
    await bind(priya, { locationId: airportId });
    await bind(priya, { locationId: downtownId });

    expect(await affectedEmails(airportId)).toEqual([]);
  });

  it("leaves out members with no bindings, bound elsewhere, and the tenant admin", async () => {
    await addMember("free@example.com");
    const elsewhere = await addMember("elsewhere@example.com");
    await bind(elsewhere, { locationId: downtownId });
    const owner = await addMember("owner@example.com", "tenant_admin");
    await bind(owner, { locationId: airportId });

    expect(await affectedEmails(airportId)).toEqual([]);
  });

  it("leaves out a member who already had no active Location", async () => {
    const gone = await insertLocation(db, tenantId, { name: "Gone", slug: "gone" });
    const priya = await addMember("priya@example.com");
    await bind(priya, { locationId: gone });
    await runEffect(archiveLocationSvc(db, tenantId, gone));

    expect(await affectedEmails(airportId)).toEqual([]);
  });

  it("does not count a Country's other Locations against a Country-bound member", async () => {
    const priya = await addMember("priya@example.com");
    const [country] = await db
      .select({ id: tenantCountries.id })
      .from(tenantCountries)
      .where(eq(tenantCountries.tenantId, tenantId));
    await bind(priya, { countryId: country.id });

    expect(await affectedEmails(airportId)).toEqual([]);
  });

  it("names a Country-bound member when this is the Country's last open Location", async () => {
    const ca = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
    const toronto = await insertLocation(db, tenantId, { name: "Toronto", slug: "toronto", countryId: ca });
    const priya = await addMember("priya@example.com");
    await bind(priya, { countryId: ca });

    expect(await affectedEmails(toronto)).toEqual(["priya@example.com"]);
  });

  it("answers not found for another Tenant's or an archived Location", async () => {
    const otherTenant = await insertTenant(db, "Other", "other");
    await expect(runEffect(archiveLocationPreviewSvc(db, otherTenant, downtownId))).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await runEffect(archiveLocationSvc(db, tenantId, airportId));
    await expect(runEffect(archiveLocationPreviewSvc(db, tenantId, airportId))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("keeping Bindings through an archive", () => {
  it("keeps the Binding row of an archived Location", async () => {
    const priya = await addMember("priya@example.com");
    await bind(priya, { locationId: airportId });
    await runEffect(archiveLocationSvc(db, tenantId, airportId));

    const rows = await db.select().from(partyRoleScopes).where(eq(partyRoleScopes.locationId, airportId));
    expect(rows).toHaveLength(1);
    const [location] = await db.select().from(tenantLocations).where(eq(tenantLocations.id, airportId));
    expect(location.archivedAt).toBeInstanceOf(Date);
  });
});
