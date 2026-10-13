import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const MIGRATIONS = fileURLToPath(
  new URL("../../../../../../packages/db-amelie/migrations", import.meta.url),
);
const DROP_CURRENCY_MIGRATION = "0019_menu_items_drop_currency.sql";

const runMigration = async (pg: PGlite, file: string) => {
  const statements = readFileSync(`${MIGRATIONS}/${file}`, "utf8").split("--> statement-breakpoint");
  for (const statement of statements) await pg.exec(statement);
};

const migrationsBefore = () =>
  readdirSync(MIGRATIONS)
    .filter((file) => file.endsWith(".sql") && file < DROP_CURRENCY_MIGRATION)
    .toSorted();

const seedCafe = async (pg: PGlite, slug: string, tenantCurrency: string, itemCurrencies: string[]) => {
  const org = await pg.query<{ id: string }>(`insert into parties (type) values ('organization') returning id`);
  await pg.query(`insert into organizations (party_id, name) values ($1, $2)`, [org.rows[0].id, slug]);
  const tenant = await pg.query<{ id: string }>(
    `insert into tenants (organization_party_id, name, slug, timezone, country, currency) values ($1, $2, $2, 'UTC', 'US', $3) returning id`,
    [org.rows[0].id, slug, tenantCurrency],
  );
  const tenantId = tenant.rows[0].id;
  const category = await pg.query<{ id: string }>(
    `insert into tenant_menu_categories (tenant_id, name) values ($1, 'Coffee') returning id`,
    [tenantId],
  );
  for (const [index, currency] of itemCurrencies.entries()) {
    await pg.query(
      `insert into tenant_menu_items (tenant_id, category_id, name, price, currency) values ($1, $2, $3, '4.00', $4)`,
      [tenantId, category.rows[0].id, `Item ${index}`, currency],
    );
  }
  return tenantId;
};

describe("0019_menu_items_drop_currency migration", () => {
  it("moves a single non-USD item currency to the Tenant, leaves mixed, USD and empty cafes alone, then drops the column", async () => {
    const pg = new PGlite();
    for (const file of migrationsBefore()) await runMigration(pg, file);
    const euro = await seedCafe(pg, "euro", "USD", ["EUR", "EUR"]);
    const mixed = await seedCafe(pg, "mixed", "USD", ["EUR", "GBP"]);
    const mixedWithUsd = await seedCafe(pg, "mixed-usd", "PHP", ["USD", "EUR"]);
    const dollar = await seedCafe(pg, "dollar", "PHP", ["USD"]);
    const empty = await seedCafe(pg, "empty", "PHP", []);

    await runMigration(pg, DROP_CURRENCY_MIGRATION);

    const rows = await pg.query<{ id: string; currency: string }>(`select id, currency from tenants`);
    const currencyOf = (id: string) => rows.rows.find((row) => row.id === id)?.currency;
    expect(currencyOf(euro)).toBe("EUR");
    expect(currencyOf(mixed)).toBe("USD");
    expect(currencyOf(mixedWithUsd)).toBe("PHP");
    expect(currencyOf(dollar)).toBe("PHP");
    expect(currencyOf(empty)).toBe("PHP");
    await expect(pg.query(`select currency from tenant_menu_items`)).rejects.toThrow(/currency/);
  });
});
