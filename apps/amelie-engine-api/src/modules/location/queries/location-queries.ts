import { and, asc, desc, eq, exists, isNull, ne, notExists } from "drizzle-orm";
import { Data, Effect } from "effect";
import {
  accessMasterRoles,
  authUser,
  partyRoles,
  partyRoleScopes,
  persons,
  roles,
  tenantCountries,
  tenantLocations,
  tenantMenuItemLocations,
  tenantMenuItems,
  tenants,
} from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Conflict, NotFound, toDbError, type DbError } from "#/lib/effect-query";
import { PG_UNIQUE_VIOLATION, pgErrorCode, pgErrorConstraint } from "#/lib/pg-error";
import type { Location, LocationArchivePreview, LocationUnsoldItem } from "@repo/contracts/amelie";
import { TENANT_ADMIN_ROLE } from "#/modules/tenant/constants";
import {
  LOCATION_LAST_ACTIVE,
  LOCATION_NOT_FOUND,
  LOCATION_SLUG_CONSTRAINT,
  LOCATION_SLUG_TAKEN,
} from "#/modules/location/constants";
import type { ActiveLocation, LocationRef } from "#/modules/location/types";

// -----
// What counts as an active Location: not archived.
// Every query that means "active" uses this.
// -----
export const isActiveLocation = isNull(tenantLocations.archivedAt);

// -----
// Thrown inside the transaction; the catch maps
// each one to its failure.
// -----
class LocationMissing extends Data.TaggedError("LocationMissing") {}
class LastActiveLocation extends Data.TaggedError("LastActiveLocation") {}

const classifyArchiveFailure = (cause: unknown): NotFound | Conflict | DbError => {
  if (cause instanceof LocationMissing) return new NotFound({ message: LOCATION_NOT_FOUND });
  if (cause instanceof LastActiveLocation) return new Conflict({ message: LOCATION_LAST_ACTIVE });
  return toDbError(cause);
};

// -----
// Oldest first, so the default Location
// leads the options.
// -----
export const listActiveLocationsEffect = (
  db: DbConnectType,
  tenantId: string,
): Effect.Effect<ActiveLocation[], DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({
          id: tenantLocations.id,
          name: tenantLocations.name,
          address: tenantLocations.address,
          phone: tenantLocations.phone,
          timezone: tenantLocations.timezone,
        })
        .from(tenantLocations)
        .where(and(eq(tenantLocations.tenantId, tenantId), isActiveLocation))
        .orderBy(asc(tenantLocations.createdAt), asc(tenantLocations.id)),
    catch: toDbError,
  });

export const listActiveLocationRefsEffect = (
  db: DbConnectType,
  tenantId: string,
): Effect.Effect<LocationRef[], DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ id: tenantLocations.id, name: tenantLocations.name, slug: tenantLocations.slug })
        .from(tenantLocations)
        .where(and(eq(tenantLocations.tenantId, tenantId), isActiveLocation))
        .orderBy(asc(tenantLocations.createdAt), asc(tenantLocations.id)),
    catch: toDbError,
  });

// -----
// The active Locations in one Country, oldest first.
// -----
export const listActiveLocationsInCountryEffect = (
  db: DbConnectType,
  tenantId: string,
  countryId: string,
): Effect.Effect<Array<{ id: string; name: string }>, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ id: tenantLocations.id, name: tenantLocations.name })
        .from(tenantLocations)
        .where(
          and(eq(tenantLocations.tenantId, tenantId), eq(tenantLocations.countryId, countryId), isActiveLocation),
        )
        .orderBy(asc(tenantLocations.createdAt), asc(tenantLocations.id)),
    catch: toDbError,
  });

export const updateLocationContactEffect = (
  db: DbConnectType,
  tenantId: string,
  locationId: string,
  contact: { address?: string | null; phone?: string | null },
): Effect.Effect<void, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .update(tenantLocations)
        .set(contact)
        .where(and(eq(tenantLocations.id, locationId), eq(tenantLocations.tenantId, tenantId))),
    catch: toDbError,
  }).pipe(Effect.asVoid);

// -----
// Locks the Tenant row first, so two requests
// archiving two different Locations take turns
// and the second sees the first. Archiving an
// archived Location, or another Tenant's, is
// not found. Answers with the menu items that
// were sold only at this Location (ADR-0001) and
// so are sold nowhere once it is archived.
// -----
export const archiveLocationEffect = (
  db: DbConnectType,
  tenantId: string,
  locationId: string,
  now: Date,
): Effect.Effect<LocationUnsoldItem[], NotFound | Conflict | DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        await tx.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, tenantId)).for("update");
        const active = await tx
          .select({ id: tenantLocations.id })
          .from(tenantLocations)
          .where(and(eq(tenantLocations.tenantId, tenantId), isActiveLocation));
        if (!active.some((row) => row.id === locationId)) throw new LocationMissing();
        if (active.length <= 1) throw new LastActiveLocation();
        const soldHere = tx
          .select({ one: tenantMenuItemLocations.menuItemId })
          .from(tenantMenuItemLocations)
          .where(
            and(
              eq(tenantMenuItemLocations.menuItemId, tenantMenuItems.id),
              eq(tenantMenuItemLocations.locationId, locationId),
              eq(tenantMenuItemLocations.isAvailable, true),
            ),
          );
        const soldAtAnotherOpenLocation = tx
          .select({ one: tenantMenuItemLocations.menuItemId })
          .from(tenantMenuItemLocations)
          .innerJoin(tenantLocations, eq(tenantLocations.id, tenantMenuItemLocations.locationId))
          .where(
            and(
              eq(tenantMenuItemLocations.menuItemId, tenantMenuItems.id),
              ne(tenantMenuItemLocations.locationId, locationId),
              eq(tenantMenuItemLocations.isAvailable, true),
              isActiveLocation,
            ),
          );
        const unsold = await tx
          .select({ id: tenantMenuItems.id, name: tenantMenuItems.name })
          .from(tenantMenuItems)
          .where(
            and(
              eq(tenantMenuItems.tenantId, tenantId),
              eq(tenantMenuItems.availableAtAllLocations, false),
              exists(soldHere),
              notExists(soldAtAnotherOpenLocation),
            ),
          )
          .orderBy(asc(tenantMenuItems.name), asc(tenantMenuItems.id));
        await tx
          .update(tenantLocations)
          .set({ archivedAt: now })
          .where(and(eq(tenantLocations.id, locationId), eq(tenantLocations.tenantId, tenantId)));
        return unsold;
      }),
    catch: classifyArchiveFailure,
  });

// -----
// The members an archive would leave with no open
// Location: bound, not the tenant admin, covering the
// Location now and nothing else once it is gone. A
// Country Binding covers its open Locations, and an
// archived Country covers nothing. Members already
// covering nothing are not named.
// -----
export const archiveLocationPreviewEffect = (
  db: DbConnectType,
  tenantId: string,
  locationId: string,
): Effect.Effect<LocationArchivePreview, NotFound | DbError> =>
  Effect.gen(function* () {
    const open = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ id: tenantLocations.id, countryId: tenantLocations.countryId })
          .from(tenantLocations)
          .innerJoin(tenantCountries, eq(tenantCountries.id, tenantLocations.countryId))
          .where(and(eq(tenantLocations.tenantId, tenantId), isActiveLocation, isNull(tenantCountries.archivedAt))),
      catch: toDbError,
    });
    const target = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ id: tenantLocations.id })
          .from(tenantLocations)
          .where(and(eq(tenantLocations.tenantId, tenantId), eq(tenantLocations.id, locationId), isActiveLocation)),
      catch: toDbError,
    });
    if (target.length === 0) return yield* new NotFound({ message: LOCATION_NOT_FOUND });
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            partyId: partyRoles.partyId,
            firstName: persons.firstName,
            lastName: persons.lastName,
            email: authUser.email,
            countryId: partyRoleScopes.countryId,
            scopedLocationId: partyRoleScopes.locationId,
          })
          .from(partyRoleScopes)
          .innerJoin(partyRoles, eq(partyRoles.id, partyRoleScopes.partyRoleId))
          .innerJoin(roles, eq(roles.id, partyRoles.roleId))
          .innerJoin(accessMasterRoles, eq(accessMasterRoles.id, roles.masterRoleId))
          .innerJoin(persons, eq(persons.partyId, partyRoles.partyId))
          .innerJoin(authUser, eq(authUser.partyId, partyRoles.partyId))
          .where(and(eq(partyRoleScopes.tenantId, tenantId), ne(accessMasterRoles.key, TENANT_ADMIN_ROLE)))
          .orderBy(asc(persons.firstName), asc(persons.lastName), asc(authUser.email)),
      catch: toDbError,
    });
    const members = new Map<string, { name: string; email: string; covered: Set<string> }>();
    for (const row of rows) {
      const member = members.get(row.partyId) ?? {
        name: `${row.firstName} ${row.lastName}`.trim(),
        email: row.email,
        covered: new Set<string>(),
      };
      for (const location of open) {
        if (location.id === row.scopedLocationId || location.countryId === row.countryId) member.covered.add(location.id);
      }
      members.set(row.partyId, member);
    }
    return {
      id: locationId,
      membersWithoutLocation: [...members]
        .filter(([, member]) => member.covered.has(locationId) && member.covered.size === 1)
        .map(([partyId, member]) => ({ partyId, name: member.name, email: member.email })),
    };
  });

const locationColumns = {
  id: tenantLocations.id,
  name: tenantLocations.name,
  slug: tenantLocations.slug,
  countryId: tenantLocations.countryId,
  address: tenantLocations.address,
  phone: tenantLocations.phone,
  timezone: tenantLocations.timezone,
  archivedAt: tenantLocations.archivedAt,
};

const toLocation = (row: Omit<Location, "archivedAt"> & { archivedAt: Date | null }): Location => ({
  ...row,
  archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
});

export const listLocationsEffect = (db: DbConnectType, tenantId: string): Effect.Effect<Location[], DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select(locationColumns)
        .from(tenantLocations)
        .where(eq(tenantLocations.tenantId, tenantId))
        .orderBy(asc(tenantLocations.createdAt), asc(tenantLocations.id)),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows.map(toLocation)));

// -----
// The timezone of the last Location created in the
// Country, archived ones included; null when none.
// -----
export const lastLocationTimezoneInCountryEffect = (
  db: DbConnectType,
  tenantId: string,
  countryId: string,
): Effect.Effect<string | null, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ timezone: tenantLocations.timezone })
        .from(tenantLocations)
        .where(and(eq(tenantLocations.tenantId, tenantId), eq(tenantLocations.countryId, countryId)))
        .orderBy(desc(tenantLocations.createdAt), desc(tenantLocations.id))
        .limit(1),
    catch: toDbError,
  }).pipe(Effect.map(([row]) => row?.timezone ?? null));

export const getTenantTimezoneEffect = (db: DbConnectType, tenantId: string): Effect.Effect<string, DbError | NotFound> =>
  Effect.tryPromise({
    try: () => db.select({ timezone: tenants.timezone }).from(tenants).where(eq(tenants.id, tenantId)),
    catch: toDbError,
  }).pipe(
    Effect.flatMap(([row]) => (row ? Effect.succeed(row.timezone) : Effect.fail(new NotFound({ message: LOCATION_NOT_FOUND })))),
  );

const classifyInsertFailure = (cause: unknown): Conflict | DbError =>
  pgErrorCode(cause) === PG_UNIQUE_VIOLATION && pgErrorConstraint(cause) === LOCATION_SLUG_CONSTRAINT
    ? new Conflict({ message: LOCATION_SLUG_TAKEN })
    : toDbError(cause);

export const insertLocationEffect = (
  db: DbConnectType,
  tenantId: string,
  location: {
    name: string;
    slug: string;
    countryId: string;
    address: string | null;
    phone: string | null;
    timezone: string;
  },
): Effect.Effect<Location, Conflict | DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .insert(tenantLocations)
        .values({ tenantId, ...location })
        .returning(locationColumns),
    catch: classifyInsertFailure,
  }).pipe(Effect.map(([row]) => toLocation(row)));

export const updateLocationEffect = (
  db: DbConnectType,
  tenantId: string,
  locationId: string,
  change: { name?: string; address?: string | null; phone?: string | null; timezone?: string },
): Effect.Effect<Location, NotFound | DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .update(tenantLocations)
        .set(change)
        .where(
          and(
            eq(tenantLocations.id, locationId),
            eq(tenantLocations.tenantId, tenantId),
            isActiveLocation,
          ),
        )
        .returning(locationColumns),
    catch: toDbError,
  }).pipe(
    Effect.flatMap(([row]) =>
      row ? Effect.succeed(toLocation(row)) : Effect.fail(new NotFound({ message: LOCATION_NOT_FOUND })),
    ),
  );
