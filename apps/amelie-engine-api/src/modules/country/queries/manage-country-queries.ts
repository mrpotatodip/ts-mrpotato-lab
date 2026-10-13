import { and, asc, eq, isNull } from "drizzle-orm";
import { Data, Effect } from "effect";
import { tenantCountries, tenantLocations, tenants } from "@repo/db-amelie";
import type { Country, CountryArchived, CreateCountryBody } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Conflict, NotFound, toDbError, type DbError } from "#/lib/effect-query";
import { PG_UNIQUE_VIOLATION, pgErrorCode, pgErrorConstraint } from "#/lib/pg-error";
import {
  COUNTRY_HAS_LOCATIONS,
  COUNTRY_LAST_OPEN,
  COUNTRY_NOT_FOUND,
  COUNTRY_TAKEN,
  COUNTRY_UNIQUE_CONSTRAINT,
} from "#/modules/country/constants";

const countryColumns = {
  id: tenantCountries.id,
  country: tenantCountries.country,
  currency: tenantCountries.currency,
  archivedAt: tenantCountries.archivedAt,
};

type CountryRow = { id: string; country: string; currency: string; archivedAt: Date | null };

// SAFETY: the table's format checks keep the code and the Currency inside the contract's lists.
const toCountry = (row: CountryRow): Country => ({
  ...row,
  archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
}) as Country;

// -----
// Thrown inside the transaction; the catch maps
// each one to its failure.
// -----
class CountryMissing extends Data.TaggedError("CountryMissing") {}
class LastOpenCountry extends Data.TaggedError("LastOpenCountry") {}
class CountryHasLocations extends Data.TaggedError("CountryHasLocations") {}

const classifyArchiveFailure = (cause: unknown): NotFound | Conflict | DbError => {
  if (cause instanceof CountryMissing) return new NotFound({ message: COUNTRY_NOT_FOUND });
  if (cause instanceof LastOpenCountry) return new Conflict({ message: COUNTRY_LAST_OPEN });
  if (cause instanceof CountryHasLocations) return new Conflict({ message: COUNTRY_HAS_LOCATIONS });
  return toDbError(cause);
};

const classifyAddFailure = (cause: unknown): Conflict | DbError =>
  pgErrorCode(cause) === PG_UNIQUE_VIOLATION && pgErrorConstraint(cause) === COUNTRY_UNIQUE_CONSTRAINT
    ? new Conflict({ message: COUNTRY_TAKEN })
    : toDbError(cause);

// -----
// Every Country of the Tenant, archived ones
// included, oldest first.
// -----
export const listCountriesEffect = (db: DbConnectType, tenantId: string): Effect.Effect<Country[], DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select(countryColumns)
        .from(tenantCountries)
        .where(eq(tenantCountries.tenantId, tenantId))
        .orderBy(asc(tenantCountries.createdAt), asc(tenantCountries.id)),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows.map(toCountry)));

// -----
// One row per country code per Tenant. An archived
// row for the code is restored, with its prices; an
// open one is a conflict. The unique index is the
// real guard if two adds race.
// -----
export const addCountryEffect = (
  db: DbConnectType,
  tenantId: string,
  body: CreateCountryBody,
): Effect.Effect<Country, Conflict | DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: tenantCountries.id, archivedAt: tenantCountries.archivedAt })
          .from(tenantCountries)
          .where(and(eq(tenantCountries.tenantId, tenantId), eq(tenantCountries.country, body.country)));
        if (!existing) {
          return tx.insert(tenantCountries).values({ tenantId, ...body }).returning(countryColumns);
        }
        if (existing.archivedAt === null) throw new Conflict({ message: COUNTRY_TAKEN });
        return tx
          .update(tenantCountries)
          .set({ currency: body.currency, archivedAt: null, updatedAt: new Date() })
          .where(eq(tenantCountries.id, existing.id))
          .returning(countryColumns);
      }),
    catch: (cause) => (cause instanceof Conflict ? cause : classifyAddFailure(cause)),
  }).pipe(Effect.map(([row]) => toCountry(row)));

// -----
// Only an open Country of this Tenant changes.
// The code is the identity and never does.
// -----
export const updateCountryCurrencyEffect = (
  db: DbConnectType,
  tenantId: string,
  countryId: string,
  currency: string,
): Effect.Effect<Country, NotFound | DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .update(tenantCountries)
        .set({ currency, updatedAt: new Date() })
        .where(
          and(
            eq(tenantCountries.id, countryId),
            eq(tenantCountries.tenantId, tenantId),
            isNull(tenantCountries.archivedAt),
          ),
        )
        .returning(countryColumns),
    catch: toDbError,
  }).pipe(
    Effect.flatMap(([row]) =>
      row ? Effect.succeed(toCountry(row)) : Effect.fail(new NotFound({ message: COUNTRY_NOT_FOUND })),
    ),
  );

// -----
// Locks the Tenant row first, so two requests
// archiving two Countries take turns and the second
// sees the first. Refused for the last open Country
// and for one that still has open Locations.
// -----
export const archiveCountryEffect = (
  db: DbConnectType,
  tenantId: string,
  countryId: string,
  now: Date,
): Effect.Effect<CountryArchived, NotFound | Conflict | DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        await tx.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, tenantId)).for("update");
        const open = await tx
          .select({ id: tenantCountries.id })
          .from(tenantCountries)
          .where(and(eq(tenantCountries.tenantId, tenantId), isNull(tenantCountries.archivedAt)));
        if (!open.some((row) => row.id === countryId)) throw new CountryMissing();
        if (open.length <= 1) throw new LastOpenCountry();
        const locations = await tx
          .select({ id: tenantLocations.id })
          .from(tenantLocations)
          .where(
            and(
              eq(tenantLocations.tenantId, tenantId),
              eq(tenantLocations.countryId, countryId),
              isNull(tenantLocations.archivedAt),
            ),
          )
          .limit(1);
        if (locations.length > 0) throw new CountryHasLocations();
        await tx.update(tenantCountries).set({ archivedAt: now, updatedAt: now }).where(eq(tenantCountries.id, countryId));
        return { id: countryId };
      }),
    catch: classifyArchiveFailure,
  });
