import { and, asc, eq, isNull } from "drizzle-orm";
import { Effect } from "effect";
import { tenantCountries, tenantLocations } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import { countryName } from "#/modules/country/lib";
import type { CountryRef } from "#/modules/country/types";

// -----
// What counts as an open Country: not archived.
// -----
export const isOpenCountry = isNull(tenantCountries.archivedAt);

// -----
// The one place that lists a Tenant's open Countries,
// oldest first, so the first Country leads the options.
// Works on a transaction too.
// -----
const selectOpenCountries = (db: Pick<DbConnectType, "select">, tenantId: string) =>
  db
    .select({ id: tenantCountries.id, code: tenantCountries.country, currency: tenantCountries.currency })
    .from(tenantCountries)
    .where(and(eq(tenantCountries.tenantId, tenantId), isOpenCountry))
    .orderBy(asc(tenantCountries.createdAt), asc(tenantCountries.id));

export const listOpenCountryRefsEffect = (db: DbConnectType, tenantId: string): Effect.Effect<CountryRef[], DbError> =>
  Effect.tryPromise({ try: () => selectOpenCountries(db, tenantId), catch: toDbError }).pipe(
    Effect.map((rows) => rows.map((row) => ({ ...row, name: countryName(row.code) }))),
  );

export const openCountryIdsEffect = (db: DbConnectType, tenantId: string): Effect.Effect<string[], DbError> =>
  Effect.tryPromise({ try: () => selectOpenCountries(db, tenantId), catch: toDbError }).pipe(
    Effect.map((rows) => rows.map((row) => row.id)),
  );

export const openCountryIds = async (tx: Pick<DbConnectType, "select">, tenantId: string): Promise<string[]> =>
  (await selectOpenCountries(tx, tenantId)).map((row) => row.id);

// -----
// A Tenant with one Country writes there. With
// several, the oldest open one, until the editor
// can name a Country.
// -----
export const firstOpenCountryId = async (
  tx: Pick<DbConnectType, "select">,
  tenantId: string,
): Promise<string | null> => {
  const [country] = await selectOpenCountries(tx, tenantId).limit(1);
  return country?.id ?? null;
};

// -----
// The Country a read quotes: the explicit countryId
// if it is an open Country of the Tenant, else the
// Location's, else the Tenant's only open one. With
// several open Countries and none in play there is
// none, so price and currency are left out and the
// assistant asks which location (ADR-0002).
// An explicit id that is not an open Country is none,
// never a fallback: the caller checks it first.
// -----
export const readCountryIdEffect = (
  db: DbConnectType,
  tenantId: string,
  locationId?: string,
  countryId?: string,
): Effect.Effect<string | null, DbError> => {
  if (countryId !== undefined) {
    return openCountryIdsEffect(db, tenantId).pipe(Effect.map((open) => (open.includes(countryId) ? countryId : null)));
  }
  return locationId === undefined
    ? openCountryIdsEffect(db, tenantId).pipe(Effect.map((open) => (open.length === 1 ? open[0] : null)))
    : Effect.tryPromise({
        try: () =>
          db
            .select({ countryId: tenantLocations.countryId })
            .from(tenantLocations)
            .where(and(eq(tenantLocations.id, locationId), eq(tenantLocations.tenantId, tenantId))),
        catch: toDbError,
      }).pipe(Effect.map(([location]) => location?.countryId ?? null));
};
