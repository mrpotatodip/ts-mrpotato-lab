import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const MIGRATIONS = fileURLToPath(
  new URL("../../../../../../packages/db-amelie/migrations", import.meta.url),
);
const PARTY_ROLES_MIGRATION = "0014_party_roles.sql";
const RENAME_ROLES_MIGRATION = "0029_rename_tenant_role_keys.sql";

const runMigration = async (pg: PGlite, file: string) => {
  const statements = readFileSync(`${MIGRATIONS}/${file}`, "utf8").split("--> statement-breakpoint");
  for (const statement of statements) await pg.exec(statement);
};

const migrationsBefore = (file: string) =>
  readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql") && name < file)
    .toSorted();

describe("0029_rename_tenant_role_keys migration", () => {
  it("renames owner, manager and staff on an existing cafe", async () => {
    const pg = new PGlite();
    for (const file of migrationsBefore(PARTY_ROLES_MIGRATION)) await runMigration(pg, file);

    const org = await pg.query<{ id: string }>(`insert into parties (type) values ('organization') returning id`);
    await pg.query(`insert into organizations (party_id, name) values ($1, $2)`, [org.rows[0].id, "sorella"]);
    const tenant = await pg.query<{ id: string }>(
      `insert into tenants (organization_party_id, name, slug, timezone) values ($1, $2, $2, 'UTC') returning id`,
      [org.rows[0].id, "sorella"],
    );
    const party = await pg.query<{ id: string }>(`insert into parties (type) values ('person') returning id`);
    await pg.query(`insert into persons (party_id, first_name, last_name) values ($1, $2, $2)`, [
      party.rows[0].id,
      "owner",
    ]);
    await pg.query(`insert into tenant_members (tenant_id, party_id, role) values ($1, $2, $3)`, [
      tenant.rows[0].id,
      party.rows[0].id,
      "owner",
    ]);

    await runMigration(pg, PARTY_ROLES_MIGRATION);
    await runMigration(pg, RENAME_ROLES_MIGRATION);

    const rolesRows = await pg.query<{ key: string; can_edit: boolean }>(
      `select key, can_edit from roles where tenant_id = $1 order by key`,
      [tenant.rows[0].id],
    );
    expect(rolesRows.rows.map((r) => [r.key, r.can_edit])).toEqual([
      ["store_admin", true],
      ["store_staff", false],
      ["tenant_admin", true],
    ]);

    const held = await pg.query<{ role_key: string }>(
      `select role_key from party_roles where party_id = $1`,
      [party.rows[0].id],
    );
    expect(held.rows[0]).toMatchObject({ role_key: "tenant_admin" });
  });
});
