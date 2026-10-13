import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const MIGRATIONS = fileURLToPath(new URL("../../../../../../packages/db-amelie/migrations/", import.meta.url).href);
const COUNTRY_MIGRATION = "0025_tenant_countries";
const CONTRACT_MIGRATION = "0026_drop_old_price_and_region_columns";

const journalTags = (): string[] => {
  const journal: { entries: { tag: string }[] } = JSON.parse(readFileSync(`${MIGRATIONS}meta/_journal.json`, "utf8"));
  return journal.entries.map((entry) => entry.tag);
};

const applyMigration = async (pg: PGlite, tag: string) => {
  const sql = readFileSync(`${MIGRATIONS}${tag}.sql`, "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) await pg.exec(statement);
};

// -----
// A database at 0025. One Tenant was backfilled
// normally. Another was created after 0025 by old
// code: no Country, a Location with no country_id,
// an item with no price row. The backfilled Tenant
// also got a new item in the gap. Then 0026 runs.
// -----
const seedDeployGapDatabase = async () => {
  const pg = new PGlite();
  const tags = journalTags();
  for (const tag of tags.slice(0, tags.indexOf(COUNTRY_MIGRATION) + 1)) await applyMigration(pg, tag);

  const addTenant = async (name: string, slug: string, country: string, currency: string) => {
    const party = (await pg.query<{ id: string }>(`insert into parties (type) values ('organization') returning id`)).rows[0];
    await pg.query(`insert into organizations (party_id, name) values ($1, $2)`, [party.id, name]);
    const tenantId = (
      await pg.query<{ id: string }>(
        `insert into tenants (organization_party_id, name, slug, timezone, country, currency) values ($1, $2, $3, 'Europe/Rome', $4, $5) returning id`,
        [party.id, name, slug, country, currency],
      )
    ).rows[0].id;
    const locationId = (
      await pg.query<{ id: string }>(`insert into tenant_locations (tenant_id, name, slug, timezone) values ($1, $2, $3, 'Europe/Rome') returning id`, [
        tenantId,
        name,
        slug,
      ])
    ).rows[0].id;
    const categoryId = (
      await pg.query<{ id: string }>(`insert into tenant_menu_categories (tenant_id, name) values ($1, 'Coffee') returning id`, [tenantId])
    ).rows[0].id;
    await pg.query(`insert into tenant_menu_items (tenant_id, category_id, name, price) values ($1, $2, 'Espresso', 1.5)`, [tenantId, categoryId]);
    return { tenantId, locationId, categoryId };
  };

  const normal = await addTenant("Normal Cafe", "normal", "IT", "EUR");
  const normalCountry = (
    await pg.query<{ id: string }>(`insert into tenant_countries (tenant_id, country, currency) values ($1, 'IT', 'EUR') returning id`, [normal.tenantId])
  ).rows[0].id;
  await pg.query(`update tenant_locations set country_id = $1 where id = $2`, [normalCountry, normal.locationId]);
  await pg.query(
    `insert into menu_item_prices (tenant_id, menu_item_id, country_id, price) select tenant_id, id, $1, price from tenant_menu_items where tenant_id = $2`,
    [normalCountry, normal.tenantId],
  );

  const gap = await addTenant("Gap Cafe", "gap", "CA", "CAD");
  await pg.query(`insert into tenant_menu_items (tenant_id, category_id, name, price, variants) values ($1, $2, 'Latte', 4.75, $3::jsonb)`, [
    normal.tenantId,
    normal.categoryId,
    JSON.stringify([{ name: "Small", price: "4.75" }]),
  ]);

  await applyMigration(pg, CONTRACT_MIGRATION);
  return { pg, normal, normalCountry, gap };
};

describe("contract migration on a database written to by old code since 0025", () => {
  it("gives the Tenant created in the gap a Country, a Location country_id and price rows", async () => {
    const { pg, gap } = await seedDeployGapDatabase();
    const countries = await pg.query<{ id: string; country: string; currency: string }>(
      `select id, country, currency from tenant_countries where tenant_id = $1`,
      [gap.tenantId],
    );
    expect(countries.rows).toMatchObject([{ country: "CA", currency: "CAD" }]);
    const location = await pg.query<{ country_id: string }>(`select country_id from tenant_locations where id = $1`, [gap.locationId]);
    expect(location.rows).toEqual([{ country_id: countries.rows[0].id }]);
    const prices = await pg.query<{ price: string; country_id: string }>(`select price, country_id from menu_item_prices where tenant_id = $1`, [
      gap.tenantId,
    ]);
    expect(prices.rows).toEqual([{ price: "1.50", country_id: countries.rows[0].id }]);
  });

  it("gives an item added to a backfilled Tenant in the gap its price row with its Variants, and leaves existing rows alone", async () => {
    const { pg, normal, normalCountry } = await seedDeployGapDatabase();
    const { rows } = await pg.query<{ name: string; price: string; variants: unknown; country_id: string }>(
      `select i.name, p.price, p.variants, p.country_id from tenant_menu_items i join menu_item_prices p on p.menu_item_id = i.id
        where i.tenant_id = $1 order by i.name`,
      [normal.tenantId],
    );
    expect(rows).toEqual([
      { name: "Espresso", price: "1.50", variants: null, country_id: normalCountry },
      { name: "Latte", price: "4.75", variants: [{ name: "Small", price: "4.75" }], country_id: normalCountry },
    ]);
    const countries = await pg.query<{ n: number }>(`select count(*)::int as n from tenant_countries where tenant_id = $1`, [normal.tenantId]);
    expect(countries.rows[0].n).toBe(1);
  });

  it("makes tenant_locations.country_id required", async () => {
    const { pg, normal } = await seedDeployGapDatabase();
    await expect(
      pg.query(`insert into tenant_locations (tenant_id, name, slug, timezone) values ($1, 'No Country', 'no-country', 'Europe/Rome')`, [normal.tenantId]),
    ).rejects.toThrow(/country_id/);
  });

  it("drops the old Tenant and item columns and their checks", async () => {
    const { pg } = await seedDeployGapDatabase();
    const columns = await pg.query<{ table_name: string; column_name: string }>(
      `select table_name, column_name from information_schema.columns where table_name in ('tenants', 'tenant_menu_items')`,
    );
    const names = columns.rows.map((c) => `${c.table_name}.${c.column_name}`);
    for (const dropped of ["tenants.country", "tenants.currency", "tenant_menu_items.price", "tenant_menu_items.currency", "tenant_menu_items.variants"]) {
      expect(names).not.toContain(dropped);
    }
    const checks = await pg.query<{ conname: string }>(
      `select conname from pg_constraint where conname in ('tenants_country_format', 'tenants_currency_format')`,
    );
    expect(checks.rows).toEqual([]);
  });
});

// -----
// A database at 0025 with one backfilled Tenant (IT, EUR),
// its Location, and an Espresso item with its price row.
// Nothing has touched the backfilled rows since. A test
// then plays the gap, old code and new code writing, and
// applies 0026.
// -----
const seedBackfilledDatabase = async () => {
  const pg = new PGlite();
  const tags = journalTags();
  for (const tag of tags.slice(0, tags.indexOf(COUNTRY_MIGRATION))) await applyMigration(pg, tag);
  const party = (await pg.query<{ id: string }>(`insert into parties (type) values ('organization') returning id`)).rows[0];
  await pg.query(`insert into organizations (party_id, name) values ($1, 'Gap Edits')`, [party.id]);
  const tenantId = (
    await pg.query<{ id: string }>(
      `insert into tenants (organization_party_id, name, slug, timezone, country, currency) values ($1, 'Gap Edits', 'gap-edits', 'Europe/Rome', 'IT', 'EUR') returning id`,
      [party.id],
    )
  ).rows[0].id;
  const categoryId = (
    await pg.query<{ id: string }>(`insert into tenant_menu_categories (tenant_id, name) values ($1, 'Coffee') returning id`, [tenantId])
  ).rows[0].id;
  const itemId = (
    await pg.query<{ id: string }>(
      `insert into tenant_menu_items (tenant_id, category_id, name, price) values ($1, $2, 'Espresso', 1.5) returning id`,
      [tenantId, categoryId],
    )
  ).rows[0].id;
  await applyMigration(pg, COUNTRY_MIGRATION);
  return { pg, tenantId, itemId };
};

describe("contract migration refreshes backfilled rows that only old code edited", () => {
  it("refreshes a price row from the item's price when old code edited the item and nothing touched the row", async () => {
    const { pg, itemId } = await seedBackfilledDatabase();
    await pg.query(`update tenant_menu_items set price = 2.25 where id = $1`, [itemId]);
    await applyMigration(pg, CONTRACT_MIGRATION);
    const { rows } = await pg.query<{ price: string }>(`select price from menu_item_prices where menu_item_id = $1`, [itemId]);
    expect(rows).toEqual([{ price: "2.25" }]);
  });

  it("refreshes the Variants the same way", async () => {
    const { pg, itemId } = await seedBackfilledDatabase();
    await pg.query(`update tenant_menu_items set variants = $2::jsonb where id = $1`, [itemId, JSON.stringify([{ name: "Double", price: "2.50" }])]);
    await applyMigration(pg, CONTRACT_MIGRATION);
    const { rows } = await pg.query<{ variants: unknown }>(`select variants from menu_item_prices where menu_item_id = $1`, [itemId]);
    expect(rows).toEqual([{ variants: [{ name: "Double", price: "2.50" }] }]);
  });

  it("keeps a price row the new code edited, even though the item column is stale", async () => {
    const { pg, itemId } = await seedBackfilledDatabase();
    await pg.query(`update menu_item_prices set price = 3.00, updated_at = created_at + interval '1 minute' where menu_item_id = $1`, [itemId]);
    await applyMigration(pg, CONTRACT_MIGRATION);
    const { rows } = await pg.query<{ price: string }>(`select price from menu_item_prices where menu_item_id = $1`, [itemId]);
    expect(rows).toEqual([{ price: "3.00" }]);
  });

  it("updates the Tenant's untouched Country when old code edited the region, and creates no second Country", async () => {
    const { pg, tenantId } = await seedBackfilledDatabase();
    await pg.query(`update tenants set country = 'CA', currency = 'CAD' where id = $1`, [tenantId]);
    await applyMigration(pg, CONTRACT_MIGRATION);
    const { rows } = await pg.query<{ country: string; currency: string }>(`select country, currency from tenant_countries where tenant_id = $1`, [tenantId]);
    expect(rows).toEqual([{ country: "CA", currency: "CAD" }]);
  });

  it("does not overwrite a Country the new code edited", async () => {
    const { pg, tenantId } = await seedBackfilledDatabase();
    await pg.query(`update tenant_countries set currency = 'USD', updated_at = created_at + interval '1 minute' where tenant_id = $1`, [tenantId]);
    await pg.query(`update tenants set country = 'CA', currency = 'CAD' where id = $1`, [tenantId]);
    await applyMigration(pg, CONTRACT_MIGRATION);
    const { rows } = await pg.query<{ country: string; currency: string }>(`select country, currency from tenant_countries where tenant_id = $1 order by country`, [tenantId]);
    expect(rows).toEqual([
      { country: "CA", currency: "CAD" },
      { country: "IT", currency: "USD" },
    ]);
  });
});
