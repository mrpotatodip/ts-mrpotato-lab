import { Effect } from "effect";
import type { CreateLocationBody, Location, LocationArchived, UpdateLocationBody } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Conflict, Invalid, NotFound, type DbError } from "#/lib/effect-query";
import { chooseCountryIdSvc } from "#/modules/country/handlers";
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

export const listLocationsSvc = (db: DbConnectType, tenantId: string): Effect.Effect<Location[], DbError> =>
  listLocationsEffect(db, tenantId);

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
// -----
export const createLocationSvc = (
  db: DbConnectType,
  tenantId: string,
  body: CreateLocationBody,
): Effect.Effect<Location, Conflict | NotFound | Invalid | DbError> =>
  Effect.gen(function* () {
    const existing = yield* listLocationsEffect(db, tenantId);
    const countryId = yield* chooseCountryIdSvc(db, tenantId, body.countryId);
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
