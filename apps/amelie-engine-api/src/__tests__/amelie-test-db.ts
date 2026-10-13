import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { and, asc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import {
  DEFAULT_TENANT_ROLES,
  authUser,
  organizations,
  parties,
  partyRoles,
  persons,
  menuItemPrices,
  roles,
  tenantCountries,
  tenantLocations,
  tenantMenuItems,
  tenants,
} from "@repo/db-amelie";
import type { RoleKeyValue } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";

const MIGRATIONS = fileURLToPath(
  new URL("../../../../packages/db-amelie/migrations", import.meta.url).href,
);

// -----
// A fresh in-process Postgres with every
// @repo/db-amelie migration applied.
// -----
export async function createTestDb(): Promise<DbConnectType> {
  return (await createTestPglite()).db;
}

// -----
// The same database with its PGlite client, for a
// test that serves it over a socket.
// -----
export async function createTestPglite() {
  const pg = new PGlite();
  const db = drizzle(pg);
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return { pg, db };
}

// -----
// Locations and Countries are read oldest first, and
// two inserts in the same instant tie on created_at,
// leaving the order to a random id. Each one a helper
// creates gets its own second, in creation order.
// -----
let createdAtClock = 0;
const nextCreatedAt = () => new Date(Date.UTC(2026, 0, 1) + ++createdAtClock * 1000);

export async function insertOrganization(db: DbConnectType, name: string) {
  const [party] = await db.insert(parties).values({ type: "organization" }).returning();
  await db.insert(organizations).values({ partyId: party.id, name });
  return party.id;
}

export async function insertTenant(
  db: DbConnectType,
  name: string,
  slug: string,
  region: { country: string; currency: string } = { country: "US", currency: "USD" },
  withLocation = true,
) {
  const organizationPartyId = await insertOrganization(db, name);
  return db.transaction(async (tx) => {
    const [tenant] = await tx
      .insert(tenants)
      .values({ organizationPartyId, name, slug, timezone: "America/New_York" })
      .returning();
    await tx.insert(roles).values(DEFAULT_TENANT_ROLES.map((role) => ({ tenantId: tenant.id, ...role })));
    const countryId = await insertCountry(tx, tenant.id, region);
    if (withLocation) {
      await tx.insert(tenantLocations).values({
        tenantId: tenant.id,
        countryId,
        name,
        slug,
        timezone: "America/New_York",
        createdAt: nextCreatedAt(),
      });
    }
    return tenant.id;
  });
}

// -----
// insertTenant gives every Tenant its Country and
// default Location, like sign-up, unless told not
// to (the Country is always created). This adds
// another Location.
// -----
export async function insertLocation(
  db: DbConnectType,
  tenantId: string,
  location: {
    name: string;
    slug: string;
    timezone?: string;
    address?: string | null;
    phone?: string | null;
    countryId?: string;
  },
) {
  const [country] = await db
    .select({ id: tenantCountries.id })
    .from(tenantCountries)
    .where(and(eq(tenantCountries.tenantId, tenantId), isNull(tenantCountries.archivedAt)))
    .orderBy(asc(tenantCountries.createdAt), asc(tenantCountries.id))
    .limit(1);
  const [row] = await db
    .insert(tenantLocations)
    .values({
      tenantId,
      countryId: country?.id,
      timezone: "America/New_York",
      createdAt: nextCreatedAt(),
      ...location,
    })
    .returning({ id: tenantLocations.id });
  return row.id;
}

// -----
// Adds a Country to a Tenant and returns its id.
// Defaults to US/USD, open. insertTenant already
// creates the Tenant's first one.
// -----
export async function insertCountry(
  db: Pick<DbConnectType, "insert">,
  tenantId: string,
  country: { country?: string; currency?: string; archivedAt?: Date | null } = {},
) {
  const [row] = await db
    .insert(tenantCountries)
    .values({ tenantId, country: "US", currency: "USD", createdAt: nextCreatedAt(), ...country })
    .returning({ id: tenantCountries.id });
  return row.id;
}

// -----
// A Country price for a Menu item that a test
// inserted straight into tenant_menu_items.
// -----
export async function insertMenuItemPrice(
  db: DbConnectType,
  tenantId: string,
  menuItemId: string,
  countryId: string,
  price: { price: string; variants?: { name: string; price: string }[] | null; isSold?: boolean },
) {
  await db.insert(menuItemPrices).values({ tenantId, menuItemId, countryId, ...price });
}

// -----
// A Menu item the way the write paths leave it: the
// item row plus its Country price, sold, in the
// Tenant's first open Country (or `countryId`).
// `isSold: false` keeps the price but stops selling it.
// -----
type MenuItemRow = Omit<typeof tenantMenuItems.$inferInsert, "tenantId"> & {
  price: string;
  variants?: { name: string; price: string }[] | null;
  isSold?: boolean;
  countryId?: string;
};

export async function insertMenuItems(db: DbConnectType, tenantId: string, rows: MenuItemRow[]) {
  const [first] = await db
    .select({ id: tenantCountries.id })
    .from(tenantCountries)
    .where(and(eq(tenantCountries.tenantId, tenantId), isNull(tenantCountries.archivedAt)))
    .orderBy(asc(tenantCountries.createdAt), asc(tenantCountries.id))
    .limit(1);
  const items = await db
    .insert(tenantMenuItems)
    .values(rows.map(({ isSold: _isSold, countryId: _countryId, price: _price, variants: _variants, ...item }) => ({ tenantId, ...item })))
    .returning();
  await db.insert(menuItemPrices).values(
    items.map((item, index) => ({
      tenantId,
      menuItemId: item.id,
      countryId: rows[index].countryId ?? first.id,
      price: rows[index].price,
      variants: rows[index].variants ?? null,
      isSold: rows[index].isSold ?? true,
    })),
  );
  return items.map((item, index) => ({ ...item, price: rows[index].price, variants: rows[index].variants ?? null }));
}

export async function insertMenuItem(db: DbConnectType, tenantId: string, row: MenuItemRow) {
  const [item] = await insertMenuItems(db, tenantId, [row]);
  return item;
}

export async function defaultLocationId(db: DbConnectType, tenantId: string) {
  const [row] = await db
    .select({ id: tenantLocations.id })
    .from(tenantLocations)
    .where(eq(tenantLocations.tenantId, tenantId))
    .orderBy(tenantLocations.createdAt)
    .limit(1);
  return row.id;
}

// -----
// A Person with a login; returns the
// login's user id and the Person's party.
// -----
export async function insertPersonWithLogin(db: DbConnectType, email: string) {
  const [party] = await db.insert(parties).values({ type: "person" }).returning();
  await db.insert(persons).values({ partyId: party.id, firstName: "Test", lastName: email });
  const userId = crypto.randomUUID();
  await db
    .insert(authUser)
    .values({ id: userId, name: email, email, emailVerified: true, partyId: party.id });
  return { userId, partyId: party.id };
}

// -----
// Gives a Person one of the Tenant's Roles,
// the way sign-up does for the owner.
// -----
export async function insertMember(
  db: DbConnectType,
  tenantId: string,
  partyId: string,
  roleKey: RoleKeyValue,
) {
  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.key, roleKey)));
  await db.insert(partyRoles).values({ partyId, tenantId, roleId: role.id, roleKey: role.key });
}
