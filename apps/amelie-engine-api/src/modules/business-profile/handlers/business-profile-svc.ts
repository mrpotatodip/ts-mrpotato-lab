import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NeedsLocation, NotFound } from "#/lib/effect-query";
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
// Tenant-wide facts plus one Location's address
// and phone. No locationId means the Tenant's
// only Location; with several it fails with the
// options, so callers never branch on null.
// -----
export const getBusinessProfileSvc = (
  db: DbConnectType,
  tenantId: string,
  locationId?: string,
): Effect.Effect<BusinessProfile, DbError | NotFound | NeedsLocation> =>
  Effect.gen(function* () {
    const location = yield* resolveLocationSvc(db, tenantId, locationId);
    const profile = yield* getTenantProfileSvc(db, tenantId);
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
): Effect.Effect<BusinessProfile, DbError | NotFound | NeedsLocation> =>
  Effect.gen(function* () {
    const { address, phone, ...tenantChange } = change;
    const contact = {
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
    };
    if (Object.keys(contact).length > 0) {
      const location = yield* resolveLocationSvc(db, tenantId, locationId);
      yield* updateLocationContactEffect(db, tenantId, location.id, contact);
    }
    if (Object.keys(tenantChange).length > 0) {
      yield* upsertBusinessProfileEffect(db, tenantId, tenantChange);
    }
    const saved = yield* getBusinessProfileSvc(db, tenantId, locationId).pipe(
      Effect.catchTag("NeedsLocation", () =>
        getTenantProfileSvc(db, tenantId).pipe(Effect.map((profile) => ({ ...profile, address: null, phone: null }))),
      ),
    );
    return saved;
  });
