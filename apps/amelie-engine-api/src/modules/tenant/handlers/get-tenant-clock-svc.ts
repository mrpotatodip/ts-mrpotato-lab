import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NotFound } from "#/lib/effect-query";
import { tenantClock } from "#/modules/tenant/lib";
import { getTenantTimezoneEffect } from "#/modules/tenant/queries";
import type { TenantClockReading } from "#/modules/tenant/types";

// -----
// The Tenant's timezone and its date and
// time right now, for hours that depend on today.
// -----
export const getTenantClockSvc = (
  db: DbConnectType,
  tenantId: string,
): Effect.Effect<TenantClockReading, DbError | NotFound> =>
  getTenantTimezoneEffect(db, tenantId).pipe(
    Effect.map((timezone) => ({ timezone, clock: tenantClock(timezone) })),
  );
