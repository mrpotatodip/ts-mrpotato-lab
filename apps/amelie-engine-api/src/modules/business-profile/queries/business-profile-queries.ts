import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { tenantBusinessProfiles } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import type { TenantProfile, TenantProfileChange } from "#/modules/business-profile/types";

const query = <A>(run: () => Promise<A>): Effect.Effect<A, DbError> =>
  Effect.tryPromise({ try: run, catch: toDbError });

const profileColumns = {
  description: tenantBusinessProfiles.description,
  websiteUrl: tenantBusinessProfiles.websiteUrl,
  email: tenantBusinessProfiles.email,
};

export const getBusinessProfileEffect = (
  db: DbConnectType,
  tenantId: string,
): Effect.Effect<TenantProfile | null, DbError> =>
  query(() =>
    db.select(profileColumns).from(tenantBusinessProfiles).where(eq(tenantBusinessProfiles.tenantId, tenantId)),
  ).pipe(Effect.map(([row]) => row ?? null));

// -----
// One profile per Tenant: the first change
// creates it, later ones update named fields.
// Address and phone live on the Location.
// -----
export const upsertBusinessProfileEffect = (
  db: DbConnectType,
  tenantId: string,
  change: TenantProfileChange,
): Effect.Effect<TenantProfile, DbError> =>
  query(() =>
    db
      .insert(tenantBusinessProfiles)
      .values({ tenantId, ...change })
      .onConflictDoUpdate({
        target: tenantBusinessProfiles.tenantId,
        set: { ...change, updatedAt: new Date() },
      })
      .returning(profileColumns),
  ).pipe(Effect.map(([row]) => row));
