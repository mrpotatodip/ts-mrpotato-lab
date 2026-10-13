import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const MIGRATIONS = fileURLToPath(new URL("../../../../../../packages/db-amelie/migrations/", import.meta.url).href);
const LOCATION_MIGRATION = "0020_tenant_locations";

const applyMigration = async (pg: PGlite, tag: string) => {
  const sql = readFileSync(`${MIGRATIONS}${tag}.sql`, "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) await pg.exec(statement);
};

const tagsBefore = (journalTag: string): string[] => {
  const journal: { entries: { tag: string }[] } = JSON.parse(readFileSync(`${MIGRATIONS}meta/_journal.json`, "utf8"));
  const tags = journal.entries.map((entry) => entry.tag);
  return tags.slice(0, tags.indexOf(journalTag));
};

// -----
// A database as it is just before the Location
// migration, holding Tenants that already have
// hours. Then the migration runs on top of it.
// -----
const seedOldDatabase = async () => {
  const pg = new PGlite();
  for (const tag of tagsBefore(LOCATION_MIGRATION)) await applyMigration(pg, tag);

  const addTenant = async (name: string, slug: string, timezone: string, profile: boolean) => {
    const party = (await pg.query<{ id: string }>(`insert into parties (type) values ('organization') returning id`)).rows[0];
    await pg.query(`insert into organizations (party_id, name) values ($1, $2)`, [party.id, name]);
    const tenant = (
      await pg.query<{ id: string }>(
        `insert into tenants (organization_party_id, name, slug, timezone, country, currency) values ($1, $2, $3, $4, 'IT', 'EUR') returning id`,
        [party.id, name, slug, timezone],
      )
    ).rows[0];
    if (profile) {
      await pg.query(`insert into tenant_business_profiles (tenant_id, address, phone) values ($1, $2, $3)`, [
        tenant.id,
        "1 Main St",
        "+1 555 0100",
      ]);
    }
    for (const day of [1, 2]) {
      await pg.query(
        `insert into tenant_business_hours (tenant_id, day_of_week, opens_at, closes_at) values ($1, $2, '08:00', '17:00')`,
        [tenant.id, day],
      );
    }
    await pg.query(`insert into tenant_business_hours_overrides (tenant_id, date, is_closed) values ($1, '2026-12-25', true)`, [
      tenant.id,
    ]);
    return tenant.id;
  };

  const withProfile = await addTenant("Sorella Cafe", "sorella", "Europe/Rome", true);
  const withoutProfile = await addTenant("Bare Bones", "bare-bones", "America/Chicago", false);
  await applyMigration(pg, LOCATION_MIGRATION);
  return { pg, withProfile, withoutProfile };
};

const HOURS_REQUIRED_MIGRATION = "0021_location_hours_required";
const CONTRACT_MIGRATION = "0022_drop_tenant_level_hours_and_contact";

// -----
// A database after 0020 where code that did not
// know about Locations kept writing: hours and an
// override with no location_id, and a profile
// address saved after the Location was made.
// -----
const seedPostLocationDatabase = async () => {
  const pg = new PGlite();
  for (const tag of tagsBefore(HOURS_REQUIRED_MIGRATION)) await applyMigration(pg, tag);

  const party = (await pg.query<{ id: string }>(`insert into parties (type) values ('organization') returning id`)).rows[0];
  await pg.query(`insert into organizations (party_id, name) values ($1, 'Late Cafe')`, [party.id]);
  const tenantId = (
    await pg.query<{ id: string }>(
      `insert into tenants (organization_party_id, name, slug, timezone, country, currency) values ($1, 'Late Cafe', 'late', 'Europe/Rome', 'IT', 'EUR') returning id`,
      [party.id],
    )
  ).rows[0].id;
  const locationId = (
    await pg.query<{ id: string }>(
      `insert into tenant_locations (tenant_id, name, slug, timezone) values ($1, 'Late Cafe', 'late', 'Europe/Rome') returning id`,
      [tenantId],
    )
  ).rows[0].id;
  await pg.query(`insert into tenant_business_profiles (tenant_id, address, phone) values ($1, '9 New St', '+1 555 0199')`, [tenantId]);
  await pg.query(`insert into tenant_business_hours (tenant_id, day_of_week, is_closed) values ($1, 1, true)`, [tenantId]);
  await pg.query(`insert into tenant_business_hours_overrides (tenant_id, date, is_closed) values ($1, '2026-12-25', true)`, [tenantId]);
  return { pg, tenantId, locationId };
};

describe("hours-required migration on a database written to since the Location migration", () => {
  it("points stray rows at the default Location and keeps a profile address and phone saved since", async () => {
    const { pg, tenantId, locationId } = await seedPostLocationDatabase();
    await applyMigration(pg, HOURS_REQUIRED_MIGRATION);

    const hours = await pg.query<{ location_id: string }>(`select location_id from tenant_business_hours where tenant_id = $1`, [tenantId]);
    const overrides = await pg.query<{ location_id: string }>(
      `select location_id from tenant_business_hours_overrides where tenant_id = $1`,
      [tenantId],
    );
    const location = (await pg.query<{ address: string; phone: string }>(`select address, phone from tenant_locations where id = $1`, [locationId])).rows[0];
    expect(hours.rows).toEqual([{ location_id: locationId }]);
    expect(overrides.rows).toEqual([{ location_id: locationId }]);
    expect(location).toEqual({ address: "9 New St", phone: "+1 555 0199" });
  });

  it("rejects hours without a Location and a second override on one date for one Location", async () => {
    const { pg, tenantId, locationId } = await seedPostLocationDatabase();
    await applyMigration(pg, HOURS_REQUIRED_MIGRATION);

    await expect(pg.query(`insert into tenant_business_hours (tenant_id, day_of_week, is_closed) values ($1, 2, true)`, [tenantId])).rejects.toThrow(
      /location_id/,
    );
    await expect(
      pg.query(`insert into tenant_business_hours_overrides (tenant_id, location_id, date, is_closed) values ($1, $2, '2026-12-25', true)`, [
        tenantId,
        locationId,
      ]),
    ).rejects.toThrow(/uq_tenant_business_hours_overrides/);
  });

  it("lets a second Location keep its own hours once the Tenant-level uniques are gone", async () => {
    const { pg, tenantId } = await seedPostLocationDatabase();
    await applyMigration(pg, HOURS_REQUIRED_MIGRATION);
    await applyMigration(pg, CONTRACT_MIGRATION);
    const second = (
      await pg.query<{ id: string }>(
        `insert into tenant_locations (tenant_id, name, slug, timezone) values ($1, 'Airport', 'airport', 'Asia/Tokyo') returning id`,
        [tenantId],
      )
    ).rows[0].id;

    await pg.query(`insert into tenant_business_hours (tenant_id, location_id, day_of_week, is_closed) values ($1, $2, 1, true)`, [tenantId, second]);
    const columns = await pg.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name = 'tenant_business_profiles'`,
    );
    expect(columns.rows.map((c) => c.column_name)).not.toContain("address");
    expect(columns.rows.map((c) => c.column_name)).not.toContain("phone");
  });
});

// -----
// A Tenant created after 0020 ran but before the
// new code went live: it has no Location, and the
// old code gave it hours rows. 0021 must make it
// a default Location, not fail on SET NOT NULL.
// -----
describe("hours-required migration on a Tenant that has no Location", () => {
  const seedLocationlessTenants = async () => {
    const pg = new PGlite();
    for (const tag of tagsBefore(HOURS_REQUIRED_MIGRATION)) await applyMigration(pg, tag);
    const addTenant = async (name: string, slug: string, withHours: boolean) => {
      const party = (await pg.query<{ id: string }>(`insert into parties (type) values ('organization') returning id`)).rows[0];
      await pg.query(`insert into organizations (party_id, name) values ($1, $2)`, [party.id, name]);
      const tenantId = (
        await pg.query<{ id: string }>(
          `insert into tenants (organization_party_id, name, slug, timezone, country, currency) values ($1, $2, $3, 'Europe/Rome', 'IT', 'EUR') returning id`,
          [party.id, name, slug],
        )
      ).rows[0].id;
      await pg.query(`insert into tenant_business_profiles (tenant_id, address, phone) values ($1, '3 Late St', '+1 555 0123')`, [tenantId]);
      if (withHours) {
        await pg.query(`insert into tenant_business_hours (tenant_id, day_of_week, is_closed) values ($1, 1, true)`, [tenantId]);
        await pg.query(`insert into tenant_business_hours_overrides (tenant_id, date, is_closed) values ($1, '2026-12-25', true)`, [tenantId]);
      }
      return tenantId;
    };
    const withHours = await addTenant("Late Hours", "late-hours", true);
    const withoutHours = await addTenant("Late Bare", "late-bare", false);
    return { pg, withHours, withoutHours };
  };

  it("creates a default Location for it and points its hours rows at it", async () => {
    const { pg, withHours } = await seedLocationlessTenants();
    await applyMigration(pg, HOURS_REQUIRED_MIGRATION);

    const locations = await pg.query<Record<string, string>>(
      `select id, name, slug, address, phone, timezone from tenant_locations where tenant_id = $1`,
      [withHours],
    );
    expect(locations.rows).toHaveLength(1);
    expect(locations.rows[0]).toMatchObject({
      name: "Late Hours",
      slug: "late-hours",
      address: "3 Late St",
      phone: "+1 555 0123",
      timezone: "Europe/Rome",
    });
    const hours = await pg.query(`select location_id from tenant_business_hours where tenant_id = $1`, [withHours]);
    const overrides = await pg.query(`select location_id from tenant_business_hours_overrides where tenant_id = $1`, [withHours]);
    expect(hours.rows).toEqual([{ location_id: locations.rows[0].id }]);
    expect(overrides.rows).toEqual([{ location_id: locations.rows[0].id }]);
  });

  it("gives a Tenant with no hours exactly one Location too, and leaves a Tenant that has one alone", async () => {
    const { pg, withoutHours } = await seedLocationlessTenants();
    await applyMigration(pg, HOURS_REQUIRED_MIGRATION);
    const count = async (tenantId: string) =>
      (await pg.query<{ n: number }>(`select count(*)::int as n from tenant_locations where tenant_id = $1`, [tenantId])).rows[0].n;
    expect(await count(withoutHours)).toBe(1);
  });
});

describe("Location migration on a database with existing Tenants", () => {
  it("gives each Tenant exactly one Location named after it, with the profile's contact details and the Tenant's timezone", async () => {
    const { pg, withProfile, withoutProfile } = await seedOldDatabase();
    const { rows } = await pg.query<Record<string, string | null>>(
      `select tenant_id, name, slug, address, phone, timezone, archived_at from tenant_locations order by name`,
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.tenant_id === withProfile)).toMatchObject({
      name: "Sorella Cafe",
      slug: "sorella",
      address: "1 Main St",
      phone: "+1 555 0100",
      timezone: "Europe/Rome",
      archived_at: null,
    });
    expect(rows.find((r) => r.tenant_id === withoutProfile)).toMatchObject({
      name: "Bare Bones",
      address: null,
      phone: null,
      timezone: "America/Chicago",
    });
  });

  it("points every hours row and override at its Tenant's Location", async () => {
    const { pg } = await seedOldDatabase();
    const hours = await pg.query<{ matches: boolean }>(
      `select (h.location_id = l.id) as matches from tenant_business_hours h
         join tenant_locations l on l.tenant_id = h.tenant_id`,
    );
    const overrides = await pg.query<{ matches: boolean }>(
      `select (o.location_id = l.id) as matches from tenant_business_hours_overrides o
         join tenant_locations l on l.tenant_id = o.tenant_id`,
    );
    expect(hours.rows).toHaveLength(4);
    expect(overrides.rows).toHaveLength(2);
    expect([...hours.rows, ...overrides.rows].every((r) => r.matches)).toBe(true);
  });
});

// -----
// A database that held Tenants, hours and menu
// items before the tenant-region migrations, then
// runs every migration after 0016 in order.
// -----
describe("tenant-region migrations followed by the Location migrations", () => {
  const REGION_MIGRATION = "0017_tenant_region";
  const LAST_MIGRATION = "0024_menu_item_locations_faq_location";

  const seedPreRegionDatabase = async () => {
    const pg = new PGlite();
    for (const tag of tagsBefore(REGION_MIGRATION)) await applyMigration(pg, tag);

    const party = (await pg.query<{ id: string }>(`insert into parties (type) values ('organization') returning id`)).rows[0];
    await pg.query(`insert into organizations (party_id, name) values ($1, 'Roma Cafe')`, [party.id]);
    const tenantId = (
      await pg.query<{ id: string }>(
        `insert into tenants (organization_party_id, name, slug, timezone) values ($1, 'Roma Cafe', 'roma', 'Europe/Rome') returning id`,
        [party.id],
      )
    ).rows[0].id;
    await pg.query(`insert into tenant_business_hours (tenant_id, day_of_week, opens_at, closes_at) values ($1, 1, '08:00', '17:00')`, [tenantId]);
    const categoryId = (
      await pg.query<{ id: string }>(`insert into tenant_menu_categories (tenant_id, name) values ($1, 'Coffee') returning id`, [tenantId])
    ).rows[0].id;
    await pg.query(`insert into tenant_menu_items (tenant_id, category_id, name, price, currency) values ($1, $2, 'Espresso', 1.50, 'EUR')`, [
      tenantId,
      categoryId,
    ]);
    return { pg, tenantId };
  };

  it("keeps the Tenant's currency from its menu, gives it one Location, and keeps its hours and menu items", async () => {
    const { pg, tenantId } = await seedPreRegionDatabase();
    const journal: { entries: { tag: string }[] } = JSON.parse(readFileSync(`${MIGRATIONS}meta/_journal.json`, "utf8"));
    const tags = journal.entries.map((entry) => entry.tag);
    for (const tag of tags.slice(tags.indexOf(REGION_MIGRATION), tags.indexOf(LAST_MIGRATION) + 1)) await applyMigration(pg, tag);

    const tenant = (await pg.query<{ country: string; currency: string }>(`select country, currency from tenants where id = $1`, [tenantId])).rows[0];
    const locations = await pg.query<{ id: string; name: string }>(`select id, name from tenant_locations where tenant_id = $1`, [tenantId]);
    const hours = await pg.query<{ location_id: string }>(`select location_id from tenant_business_hours where tenant_id = $1`, [tenantId]);
    const items = await pg.query<{ name: string; available_at_all_locations: boolean }>(
      `select name, available_at_all_locations from tenant_menu_items where tenant_id = $1`,
      [tenantId],
    );
    expect(tenant).toEqual({ country: "US", currency: "EUR" });
    expect(locations.rows).toHaveLength(1);
    expect(locations.rows[0].name).toBe("Roma Cafe");
    expect(hours.rows).toEqual([{ location_id: locations.rows[0].id }]);
    expect(items.rows).toEqual([{ name: "Espresso", available_at_all_locations: true }]);
  });
});
