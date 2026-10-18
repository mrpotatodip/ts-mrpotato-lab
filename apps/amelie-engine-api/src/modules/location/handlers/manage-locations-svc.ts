import { Effect } from "effect";
import {
  covers,
  type Coverage,
  type CreateLocationBody,
  type Location,
  type LocationArchived,
  type UpdateLocationBody,
} from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Conflict, Forbidden, Invalid, NotFound, type DbError } from "#/lib/effect-query";
import { chooseCountryIdSvc } from "#/modules/country/handlers";
import { TENANT_COUNTRY_NOT_COVERED, type CountryScope } from "#/modules/tenant";
import { archiveLocationSvc } from "./archive-location-svc";
import { slugify, withSlugSuffix } from "#/lib/slugify";
import {
  LOCATION_NOT_FOUND,
  LOCATION_SLUG_FALLBACK,
  LOCATION_SLUG_MAX_LENGTH,
} from "#/modules/location/constants";
import {
  getTenantTimezoneEffect,
  insertLocationEffect,
  lastLocationTimezoneInCountryEffect,
  listLocationsEffect,
  updateLocationEffect,
} from "#/modules/location/queries";

export const listLocationsSvc = (
  db: DbConnectType,
  tenantId: string,
  coverage: Coverage = "all",
): Effect.Effect<Location[], DbError> =>
  listLocationsEffect(db, tenantId).pipe(
    Effect.map((locations) => locations.filter((location) => covers(coverage, [location.id]))),
  );

const freeSlug = (name: string, taken: Set<string>): string => {
  const base = slugify(name, LOCATION_SLUG_MAX_LENGTH, LOCATION_SLUG_FALLBACK);
  for (let n = 1; ; n++) {
    const candidate = withSlugSuffix(base, n, LOCATION_SLUG_MAX_LENGTH);
    if (!taken.has(candidate)) return candidate;
  }
};

// -----
// The slug comes from the name and is unique per
// Tenant, archived Locations included; the unique
// index is the real guard if two adds race.
// The Country is the body's, which must be an open
// one of the Tenant, else the only one. A Location
// without a timezone gets the last one created in
// its Country, else the Tenant's.
// A member bound to Countries opens Locations only in
// those: with none named their only bound Country is
// the default, and any other Country is Forbidden.
// -----
export const createLocationSvc = (
  db: DbConnectType,
  tenantId: string,
  body: CreateLocationBody,
  countryScope: CountryScope = "all",
): Effect.Effect<Location, Conflict | NotFound | Invalid | Forbidden | DbError> =>
  Effect.gen(function* () {
    if (countryScope !== "all" && countryScope.length === 0) {
      return yield* new Forbidden({ message: TENANT_COUNTRY_NOT_COVERED });
    }
    const existing = yield* listLocationsEffect(db, tenantId);
    const named = body.countryId ?? (countryScope !== "all" && countryScope.length === 1 ? countryScope[0] : undefined);
    const countryId = yield* chooseCountryIdSvc(db, tenantId, named);
    if (countryScope !== "all" && !countryScope.includes(countryId)) {
      return yield* new Forbidden({ message: TENANT_COUNTRY_NOT_COVERED });
    }
    const timezone =
      body.timezone ??
      (yield* lastLocationTimezoneInCountryEffect(db, tenantId, countryId)) ??
      (yield* getTenantTimezoneEffect(db, tenantId));
    return yield* insertLocationEffect(db, tenantId, {
      name: body.name,
      countryId,
      slug: freeSlug(body.name, new Set(existing.map((location) => location.slug))),
      address: body.address ?? null,
      phone: body.phone ?? null,
      timezone,
    });
  });

// -----
// A field left out is kept; one sent as null is
// cleared. The slug never changes on rename.
// -----
export const updateLocationSvc = (
  db: DbConnectType,
  tenantId: string,
  locationId: string,
  change: UpdateLocationBody,
): Effect.Effect<Location, NotFound | DbError> => {
  if (Object.values(change).every((value) => value === undefined)) {
    return listLocationsEffect(db, tenantId).pipe(
      Effect.flatMap((all) => {
        const found = all.find((location) => location.id === locationId && location.archivedAt === null);
        return found ? Effect.succeed(found) : Effect.fail(new NotFound({ message: LOCATION_NOT_FOUND }));
      }),
    );
  }
  return updateLocationEffect(db, tenantId, locationId, change);
};

// -----
// archiveLocationSvc for the REST route: the
// same archive, answering with the id and the
// items it left unsold.
// -----
export const archiveLocationReturningIdSvc = (
  db: DbConnectType,
  tenantId: string,
  locationId: string,
): Effect.Effect<LocationArchived, NotFound | Conflict | DbError> =>
  archiveLocationSvc(db, tenantId, locationId).pipe(
    Effect.map((unsoldMenuItems) => ({ id: locationId, unsoldMenuItems })),
  );
