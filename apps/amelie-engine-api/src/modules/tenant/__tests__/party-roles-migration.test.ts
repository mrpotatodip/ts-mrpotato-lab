import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const MIGRATIONS = fileURLToPath(
  new URL("../../../../../../packages/db-amelie/migrations", import.meta.url),
);
const PARTY_ROLES_MIGRATION = "0014_party_roles.sql";

const runMigration = async (pg: PGlite, file: string) => {
  const statements = readFileSync(`${MIGRATIONS}/${file}`, "utf8").split("--> statement-breakpoint");
  for (const statement of statements) await pg.exec(statement);
};

const migrationsBefore = () =>
  readdirSync(MIGRATIONS)
    .filter((file) => file.endsWith(".sql") && file < PARTY_ROLES_MIGRATION)
    .toSorted();

// -----
// A cafe as it was before 0014: an owner, an
// admin and a member in tenant_members.
// -----
const seedOldCafe = async (pg: PGlite, slug: string) => {
  const org = await pg.query<{ id: string }>(`insert into parties (type) values ('organization') returning id`);
  await pg.query(`insert into organizations (party_id, name) values ($1, $2)`, [org.rows[0].id, slug]);
  const tenant = await pg.query<{ id: string }>(
    `insert into tenants (organization_party_id, name, slug, timezone) values ($1, $2, $2, 'UTC') returning id`,
    [org.rows[0].id, slug],
  );
  const people: Record<string, string> = {};
  for (const role of ["owner", "admin", "member"]) {
    const party = await pg.query<{ id: string }>(`insert into parties (type) values ('person') returning id`);
    await pg.query(`insert into persons (party_id, first_name, last_name) values ($1, $2, $2)`, [
      party.rows[0].id,
      role,
    ]);
    await pg.query(`insert into tenant_members (tenant_id, party_id, role) values ($1, $2, $3)`, [
      tenant.rows[0].id,
      party.rows[0].id,
      role,
    ]);
    people[role] = party.rows[0].id;
  }
  return { tenantId: tenant.rows[0].id, people };
};

describe("0014_party_roles migration", () => {
  it("backfills an existing cafe with renamed roles, keeps everyone's power and drops tenant_members", async () => {
    const pg = new PGlite();
    for (const file of migrationsBefore()) await runMigration(pg, file);
    const sorella = await seedOldCafe(pg, "sorella");
    const other = await seedOldCafe(pg, "other");

    await runMigration(pg, PARTY_ROLES_MIGRATION);

    const rolesRows = await pg.query<{ tenant_id: string; key: string; can_edit: boolean }>(
      `select tenant_id, key, can_edit from roles order by tenant_id, key`,
    );
    for (const tenantId of [sorella.tenantId, other.tenantId]) {
      expect(
        rolesRows.rows.filter((r) => r.tenant_id === tenantId).map((r) => [r.key, r.can_edit]),
      ).toEqual([
        ["manager", true],
        ["owner", true],
        ["staff", false],
      ]);
    }

    const held = await pg.query<{ party_id: string; tenant_id: string; role_key: string; can_edit: boolean }>(
      `select pr.party_id, pr.tenant_id, pr.role_key, r.can_edit
         from party_roles pr join roles r on r.id = pr.role_id`,
    );
    const heldBy = (partyId: string) => held.rows.find((r) => r.party_id === partyId);
    expect(held.rows).toHaveLength(6);
    expect(heldBy(sorella.people.owner)).toMatchObject({ tenant_id: sorella.tenantId, role_key: "owner", can_edit: true });
    expect(heldBy(sorella.people.admin)).toMatchObject({ tenant_id: sorella.tenantId, role_key: "manager", can_edit: true });
    expect(heldBy(sorella.people.member)).toMatchObject({ tenant_id: sorella.tenantId, role_key: "staff", can_edit: false });
    expect(heldBy(other.people.admin)).toMatchObject({ tenant_id: other.tenantId, role_key: "manager" });

    const oldTable = await pg.query<{ n: string | null }>(`select to_regclass('public.tenant_members') as n`);
    const oldEnum = await pg.query(`select 1 from pg_type where typname = 'tenant_member_role'`);
    expect(oldTable.rows[0].n).toBeNull();
    expect(oldEnum.rows).toHaveLength(0);
  });

  it("migrates a database with no cafes", async () => {
    const pg = new PGlite();
    for (const file of migrationsBefore()) await runMigration(pg, file);

    await runMigration(pg, PARTY_ROLES_MIGRATION);

    const rolesRows = await pg.query(`select 1 from roles`);
    expect(rolesRows.rows).toHaveLength(0);
  });
});
