import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const MIGRATIONS = fileURLToPath(new URL("../../../../../../packages/db-amelie/migrations/", import.meta.url).href);
const COUNTRY_MIGRATION = "0025_tenant_countries";

const journalTags = (): string[] => {
  const journal: { entries: { tag: string }[] } = JSON.parse(readFileSync(`${MIGRATIONS}meta/_journal.json`, "utf8"));
  return journal.entries.map((entry) => entry.tag);
};

const applyMigration = async (pg: PGlite, tag: string) => {
  const sql = readFileSync(`${MIGRATIONS}${tag}.sql`, "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) await pg.exec(statement);
};

const applyBefore = async (pg: PGlite, tag: string) => {
  const tags = journalTags();
  for (const t of tags.slice(0, tags.indexOf(tag))) await applyMigration(pg, t);
};

// -----
// A database as it is just before the Country
// migration: Tenants in two countries with Locations
// and menus (a plain priced item, and one with
// Small/Large Variants). Then 0025 runs on top.
// -----
const seedOldDatabase = async () => {
  const pg = new PGlite();
  await applyBefore(pg, COUNTRY_MIGRATION);

  const addTenant = async (name: string, slug: string, country: string, currency: string, locations: string[]) => {
    const party = (await pg.query<{ id: string }>(`insert into parties (type) values ('organization') returning id`)).rows[0];
    await pg.query(`insert into organizations (party_id, name) values ($1, $2)`, [party.id, name]);
    const tenantId = (
      await pg.query<{ id: string }>(
        `insert into tenants (organization_party_id, name, slug, timezone, country, currency) values ($1, $2, $3, 'America/Toronto', $4, $5) returning id`,
        [party.id, name, slug, country, currency],
      )
    ).rows[0].id;
    for (const [i, location] of locations.entries()) {
      await pg.query(`insert into tenant_locations (tenant_id, name, slug, timezone) values ($1, $2, $3, 'America/Toronto')`, [
        tenantId,
        location,
        `loc-${i}`,
      ]);
    }
    const categoryId = (
      await pg.query<{ id: string }>(`insert into tenant_menu_categories (tenant_id, name) values ($1, 'Coffee') returning id`, [tenantId])
    ).rows[0].id;
    await pg.query(`insert into tenant_menu_items (tenant_id, category_id, name, price) values ($1, $2, 'Espresso', 3.25)`, [tenantId, categoryId]);
    await pg.query(`insert into tenant_menu_items (tenant_id, category_id, name, price, variants) values ($1, $2, 'Latte', 4.75, $3::jsonb)`, [
      tenantId,
      categoryId,
      JSON.stringify([
        { name: "Small", price: "4.75" },
        { name: "Large", price: "6.25" },
      ]),
    ]);
    return tenantId;
  };

  const canada = await addTenant("Toronto Cafe", "toronto", "CA", "CAD", ["Downtown", "Airport"]);
  const italy = await addTenant("Roma Cafe", "roma", "IT", "EUR", ["Centro"]);
  await applyMigration(pg, COUNTRY_MIGRATION);
  return { pg, canada, italy };
};

describe("Country migration on a database with existing Tenants", () => {
  it("gives each Tenant exactly one Country taken from tenants.country and tenants.currency", async () => {
    const { pg, canada, italy } = await seedOldDatabase();
    const { rows } = await pg.query<Record<string, string | null>>(
      `select tenant_id, country, currency, archived_at from tenant_countries order by country`,
    );
    expect(rows).toEqual([
      { tenant_id: canada, country: "CA", currency: "CAD", archived_at: null },
      { tenant_id: italy, country: "IT", currency: "EUR", archived_at: null },
    ]);
  });

  it("points every Location at its own Tenant's Country", async () => {
    const { pg } = await seedOldDatabase();
    const { rows } = await pg.query<{ locations: number; matching: number }>(
      `select count(*)::int as locations,
              count(*) filter (where c.tenant_id = l.tenant_id and c.country = t.country)::int as matching
         from tenant_locations l
         join tenants t on t.id = l.tenant_id
         left join tenant_countries c on c.id = l.country_id`,
    );
    expect(rows[0]).toEqual({ locations: 3, matching: 3 });
  });

  it("gives every item a sold price row in its Tenant's Country, equal to its old price and Variants", async () => {
    const { pg, canada } = await seedOldDatabase();
    const { rows } = await pg.query<{ name: string; price: string; variants: unknown; is_sold: boolean; country: string }>(
      `select i.name, p.price, p.variants, p.is_sold, c.country
         from tenant_menu_items i
         join menu_item_prices p on p.menu_item_id = i.id and p.tenant_id = i.tenant_id
         join tenant_countries c on c.id = p.country_id
        where i.tenant_id = $1 order by i.name`,
      [canada],
    );
    expect(rows).toEqual([
      { name: "Espresso", price: "3.25", variants: null, is_sold: true, country: "CA" },
      {
        name: "Latte",
        price: "4.75",
        variants: [
          { name: "Small", price: "4.75" },
          { name: "Large", price: "6.25" },
        ],
        is_sold: true,
        country: "CA",
      },
    ]);
    const total = await pg.query<{ items: number; prices: number }>(
      `select (select count(*)::int from tenant_menu_items) as items, (select count(*)::int from menu_item_prices) as prices`,
    );
    expect(total.rows[0]).toEqual({ items: 4, prices: 4 });
  });

  it("keeps the old Tenant and item columns", async () => {
    const { pg } = await seedOldDatabase();
    const { rows } = await pg.query<{ price: string; currency: string }>(
      `select i.price, t.currency from tenant_menu_items i join tenants t on t.id = i.tenant_id where i.name = 'Espresso' order by t.currency`,
    );
    expect(rows).toEqual([
      { price: "3.25", currency: "CAD" },
      { price: "3.25", currency: "EUR" },
    ]);
  });

  it("changes nothing when its backfill statements run again", async () => {
    const { pg } = await seedOldDatabase();
    const sql = readFileSync(`${MIGRATIONS}${COUNTRY_MIGRATION}.sql`, "utf8");
    const backfill = sql
      .split("--> statement-breakpoint")
      .map((s) => s.replace(/^(\s*--.*\n)+/g, "").trim())
      .filter((s) => /^(INSERT|UPDATE)\b/i.test(s));
    expect(backfill.length).toBeGreaterThan(0);
    for (const statement of backfill) await pg.exec(statement);
    const counts = await pg.query<{ countries: number; prices: number }>(
      `select (select count(*)::int from tenant_countries) as countries, (select count(*)::int from menu_item_prices) as prices`,
    );
    expect(counts.rows[0]).toEqual({ countries: 2, prices: 4 });
  });
});

// -----
// A Tenant that predates the tenant-region
// migrations: every migration from 0017 on runs
// over it in order, 0025 last.
// -----
describe("Country migration after the earlier migrations", () => {
  it("backfills a Tenant that was created before the tenant-region migrations", async () => {
    const pg = new PGlite();
    await applyBefore(pg, "0017_tenant_region");
    const party = (await pg.query<{ id: string }>(`insert into parties (type) values ('organization') returning id`)).rows[0];
    await pg.query(`insert into organizations (party_id, name) values ($1, 'Old Cafe')`, [party.id]);
    const tenantId = (
      await pg.query<{ id: string }>(
        `insert into tenants (organization_party_id, name, slug, timezone) values ($1, 'Old Cafe', 'old', 'Europe/Rome') returning id`,
        [party.id],
      )
    ).rows[0].id;
    const categoryId = (
      await pg.query<{ id: string }>(`insert into tenant_menu_categories (tenant_id, name) values ($1, 'Coffee') returning id`, [tenantId])
    ).rows[0].id;
    await pg.query(`insert into tenant_menu_items (tenant_id, category_id, name, price, currency) values ($1, $2, 'Espresso', 1.50, 'EUR')`, [
      tenantId,
      categoryId,
    ]);
    const tags = journalTags();
    for (const tag of tags.slice(tags.indexOf("0017_tenant_region"))) await applyMigration(pg, tag);

    const countries = await pg.query<{ country: string; currency: string }>(
      `select country, currency from tenant_countries where tenant_id = $1`,
      [tenantId],
    );
    const locations = await pg.query<{ country_id: string }>(`select country_id from tenant_locations where tenant_id = $1`, [tenantId]);
    const prices = await pg.query<{ price: string }>(`select price from menu_item_prices where tenant_id = $1`, [tenantId]);
    expect(countries.rows).toEqual([{ country: "US", currency: "EUR" }]);
    expect(locations.rows).toHaveLength(1);
    expect(locations.rows[0].country_id).toBeTruthy();
    expect(prices.rows).toEqual([{ price: "1.50" }]);
  });
});
