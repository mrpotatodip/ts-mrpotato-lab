import { Effect } from "effect";
import type { Coverage } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NeedsLocation, NotFound } from "#/lib/effect-query";
import { listOpenCountryRefsEffect, readCountryIdEffect } from "#/modules/country";
import { resolveLocationSvc, updateLocationContactEffect } from "#/modules/location";
import {
  getBusinessProfileEffect,
  upsertBusinessProfileEffect,
} from "#/modules/business-profile/queries";
import type {
  BusinessProfile,
  BusinessProfileChange,
  TenantProfile,
} from "#/modules/business-profile/types";

const EMPTY_TENANT_PROFILE: TenantProfile = {
  description: null,
  websiteUrl: null,
  email: null,
};

// -----
// The facts that are the same at every Location.
// No row yet reads as every field empty.
// -----
export const getTenantProfileSvc = (
  db: DbConnectType,
  tenantId: string,
): Effect.Effect<TenantProfile, DbError> =>
  getBusinessProfileEffect(db, tenantId).pipe(Effect.map((profile) => profile ?? EMPTY_TENANT_PROFILE));

// -----
// Description, website and email sit on the
// Tenant. With several Countries they belong
// to the first (sign-up) Country, not to a
// later one: that later Location only has
// its own address and phone.
// -----
export const tenantProfileForCountrySvc = (
  db: DbConnectType,
  tenantId: string,
  countryId: string | null,
): Effect.Effect<TenantProfile, DbError> =>
  Effect.gen(function* () {
    const open = yield* listOpenCountryRefsEffect(db, tenantId);
    const home = open[0]?.id;
    if (open.length > 1 && countryId !== home) return EMPTY_TENANT_PROFILE;
    return yield* getTenantProfileSvc(db, tenantId);
  });

// -----
// Tenant-wide facts plus one Location's address
// and phone. No locationId means the Tenant's
// only Location; with several it fails with the
// options, so callers never branch on null.
// -----
export const getBusinessProfileSvc = (
  db: DbConnectType,
  tenantId: string,
  locationId?: string,
  coverage: Coverage = "all",
): Effect.Effect<BusinessProfile, DbError | NotFound | NeedsLocation> =>
  Effect.gen(function* () {
    const location = yield* resolveLocationSvc(db, tenantId, locationId, coverage);
    const countryId = yield* readCountryIdEffect(db, tenantId, location.id);
    const profile = yield* tenantProfileForCountrySvc(db, tenantId, countryId);
    return { ...profile, address: location.address, phone: location.phone };
  });

// -----
// Address and phone go to the Location, the
// rest to the Tenant. A change that leaves both
// out needs no Location; the answer then shows
// no address or phone when none was chosen.
// -----
export const updateBusinessProfileSvc = (
  db: DbConnectType,
  tenantId: string,
  change: BusinessProfileChange,
  locationId?: string,
  coverage: Coverage = "all",
): Effect.Effect<BusinessProfile, DbError | NotFound | NeedsLocation> =>
  Effect.gen(function* () {
    const { address, phone, ...tenantChange } = change;
    const contact = {
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
    };
    if (Object.keys(contact).length > 0) {
      const location = yield* resolveLocationSvc(db, tenantId, locationId, coverage);
      yield* updateLocationContactEffect(db, tenantId, location.id, contact);
    }
    if (Object.keys(tenantChange).length > 0) {
      yield* upsertBusinessProfileEffect(db, tenantId, tenantChange);
    }
    const saved = yield* getBusinessProfileSvc(db, tenantId, locationId, coverage).pipe(
      Effect.catchTag("NeedsLocation", () =>
        getTenantProfileSvc(db, tenantId).pipe(Effect.map((profile) => ({ ...profile, address: null, phone: null }))),
      ),
    );
    return saved;
  });
