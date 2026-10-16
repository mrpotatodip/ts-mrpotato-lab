import { and, asc, eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import {
  authUser,
  partyRoles,
  accessMasterPowers,
  accessMasterRoles,
  accessRolePowers,
  roles,
  tenantCountries,
  tenants,
} from "@repo/db-amelie";
import { TenantSchema, type Tenant, type TenantRegion } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Conflict, NotFound, toDbError, type DbError } from "#/lib/effect-query";
import { PG_UNIQUE_VIOLATION, pgErrorCode, pgErrorConstraint } from "#/lib/pg-error";
import { openCountryIds } from "#/modules/country/queries";
import {
  TENANT_COUNTRY_CONSTRAINT,
  TENANT_COUNTRY_TAKEN,
  TENANT_NOT_FOUND,
  TENANT_REGION_MANY_COUNTRIES,
} from "#/modules/tenant/constants";
import type { PublicTenant, PublicTenantListing } from "#/modules/tenant/types";

const parseOwnRow = <A>(parse: () => A): Effect.Effect<A> =>
  Effect.try(parse).pipe(Effect.orDie);

const tenantColumns = {
  id: tenants.id,
  name: tenants.name,
  slug: tenants.slug,
  timezone: tenants.timezone,
  country: tenantCountries.country,
  currency: tenantCountries.currency,
  allowedOrigins: tenants.allowedOrigins,
  customerChatLabel: tenants.customerChatLabel,
  customerChatAccent: tenants.customerChatAccent,
  role: accessMasterRoles.key,
  roleLabel: accessMasterRoles.label,
  powers: sql<string[]>`coalesce((
    select array_agg(${accessMasterPowers.power} order by ${accessMasterPowers.power})
    from ${accessRolePowers}
    join ${accessMasterPowers} on ${accessMasterPowers.id} = ${accessRolePowers.masterPowerId}
    where ${accessRolePowers.masterRoleId} = ${roles.masterRoleId}
  ), '{}'::text[])`.as("powers"),
};

// -----
// A login reaches a Tenant only through its
// Person's party_roles row. Its region is its
// first open Country (the oldest one if all are
// archived), so a one-Country cafe reads as before.
// -----
const regionCountryId = sql`(
  select c.id from tenant_countries c where c.tenant_id = ${tenants.id}
  order by (c.archived_at is not null), c.created_at, c.id limit 1
)`;

const memberTenants = (db: DbConnectType) =>
  db
    .select(tenantColumns)
    .from(tenants)
    .innerJoin(partyRoles, eq(partyRoles.tenantId, tenants.id))
    .innerJoin(roles, eq(roles.id, partyRoles.roleId))
    .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, roles.masterRoleId))
    .innerJoin(authUser, eq(authUser.partyId, partyRoles.partyId))
    .innerJoin(tenantCountries, eq(tenantCountries.id, regionCountryId));

export const listTenantsForUserEffect = (
  db: DbConnectType,
  userId: string,
): Effect.Effect<Tenant[], DbError> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () => memberTenants(db).where(eq(authUser.id, userId)).orderBy(asc(tenants.name)),
      catch: toDbError,
    });
    return yield* parseOwnRow(() => TenantSchema.array().parse(rows));
  });

// -----
// Not a member reads as not found, so a
// Tenant's existence never leaks.
// -----
export const getTenantForUserEffect = (
  db: DbConnectType,
  userId: string,
  tenantId: string,
): Effect.Effect<Tenant, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        memberTenants(db)
          .where(and(eq(authUser.id, userId), eq(tenants.id, tenantId)))
          .limit(1),
      catch: toDbError,
    });
    const [row] = rows;
    if (!row) return yield* new NotFound({ message: TENANT_NOT_FOUND });
    return yield* parseOwnRow(() => TenantSchema.parse(row));
  });

// -----
// Edits the only open Country: its country code
// and its currency. Prices keep their numbers.
// With 2 or more open Countries the Region card
// does not apply (a conflict pointing at the
// Countries settings). The code is otherwise the
// Country's identity and never changes.
// A code the Tenant already has in another Country
// is a conflict (one Country per code).
// -----
const classifyRegionFailure = (cause: unknown): Conflict | DbError =>
  cause instanceof Conflict
    ? cause
    : pgErrorCode(cause) === PG_UNIQUE_VIOLATION && pgErrorConstraint(cause) === TENANT_COUNTRY_CONSTRAINT
    ? new Conflict({ message: TENANT_COUNTRY_TAKEN })
    : toDbError(cause);

export const updateTenantRegionEffect = (
  db: DbConnectType,
  userId: string,
  tenantId: string,
  region: TenantRegion,
): Effect.Effect<Tenant, DbError | NotFound | Conflict> =>
  Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const open = await openCountryIds(tx, tenantId);
          if (open.length > 1) throw new Conflict({ message: TENANT_REGION_MANY_COUNTRIES });
          const countryId = open[0];
          if (countryId) {
            await tx
              .update(tenantCountries)
              .set({ country: region.country, currency: region.currency, updatedAt: new Date() })
              .where(eq(tenantCountries.id, countryId));
          }
        }),
      catch: classifyRegionFailure,
    });
    return yield* getTenantForUserEffect(db, userId, tenantId);
  });

export const updateTenantAllowedOriginsEffect = (
  db: DbConnectType,
  userId: string,
  tenantId: string,
  allowedOrigins: string[],
): Effect.Effect<Tenant, DbError | NotFound> =>
  Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: () =>
        db
          .update(tenants)
          .set({ allowedOrigins, updatedAt: new Date() })
          .where(eq(tenants.id, tenantId)),
      catch: toDbError,
    });
    return yield* getTenantForUserEffect(db, userId, tenantId);
  });

export const updateTenantCustomerChatEffect = (
  db: DbConnectType,
  userId: string,
  tenantId: string,
  customerChatLabel: string,
  customerChatAccent: string | null,
): Effect.Effect<Tenant, DbError | NotFound> =>
  Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: () =>
        db
          .update(tenants)
          .set({ customerChatLabel, customerChatAccent, updatedAt: new Date() })
          .where(eq(tenants.id, tenantId)),
      catch: toDbError,
    });
    return yield* getTenantForUserEffect(db, userId, tenantId);
  });

// -----
// The public widget names a Tenant by slug;
// the id never leaves the server.
// -----
export const findPublicTenantBySlugEffect = (
  db: DbConnectType,
  slug: string,
): Effect.Effect<PublicTenant, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: tenants.id,
            name: tenants.name,
            timezone: tenants.timezone,
            allowedOrigins: tenants.allowedOrigins,
            customerChatLabel: tenants.customerChatLabel,
            customerChatAccent: tenants.customerChatAccent,
          })
          .from(tenants)
          .where(eq(tenants.slug, slug))
          .limit(1),
      catch: toDbError,
    });
    const [row] = rows;
    if (!row) return yield* new NotFound({ message: TENANT_NOT_FOUND });
    return row;
  });

// -----
// By id, for server code that already
// holds a trusted tenantId.
// -----
export const getTenantTimezoneEffect = (
  db: DbConnectType,
  tenantId: string,
): Effect.Effect<string, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db.select({ timezone: tenants.timezone }).from(tenants).where(eq(tenants.id, tenantId)).limit(1),
      catch: toDbError,
    });
    const [row] = rows;
    if (!row) return yield* new NotFound({ message: TENANT_NOT_FOUND });
    return row.timezone;
  });

// -----
// Only what a caller needs to name a Tenant:
// no id, timezone or allowed origins.
// -----
export const listPublicTenantsEffect = (
  db: DbConnectType,
): Effect.Effect<PublicTenantListing[], DbError> =>
  Effect.tryPromise({
    try: () =>
      db.select({ name: tenants.name, slug: tenants.slug }).from(tenants).orderBy(asc(tenants.name)),
    catch: toDbError,
  });
