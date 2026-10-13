import { and, asc, eq, gte } from "drizzle-orm";
import { Effect } from "effect";
import { tenantBusinessHours, tenantBusinessHoursOverrides } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import type { BusinessHours, HoursOverride } from "#/modules/schedule/types";

// -----
// Every query here filters on tenant_id and
// location_id; both come from server context.
// -----
const query = <A>(run: () => Promise<A>): Effect.Effect<A, DbError> =>
  Effect.tryPromise({ try: run, catch: toDbError });

export const listBusinessHoursEffect = (
  db: DbConnectType,
  tenantId: string,
  locationId: string,
): Effect.Effect<BusinessHours[], DbError> =>
  query(() =>
    db
      .select({
        dayOfWeek: tenantBusinessHours.dayOfWeek,
        opensAt: tenantBusinessHours.opensAt,
        closesAt: tenantBusinessHours.closesAt,
        isClosed: tenantBusinessHours.isClosed,
      })
      .from(tenantBusinessHours)
      .where(
        and(eq(tenantBusinessHours.tenantId, tenantId), eq(tenantBusinessHours.locationId, locationId)),
      )
      .orderBy(asc(tenantBusinessHours.dayOfWeek)),
  );

// -----
// Only today and later: a past override
// can't answer anything.
// -----
export const listUpcomingHoursOverridesEffect = (
  db: DbConnectType,
  tenantId: string,
  locationId: string,
  today: string,
): Effect.Effect<HoursOverride[], DbError> =>
  query(() =>
    db
      .select({
        date: tenantBusinessHoursOverrides.date,
        opensAt: tenantBusinessHoursOverrides.opensAt,
        closesAt: tenantBusinessHoursOverrides.closesAt,
        isClosed: tenantBusinessHoursOverrides.isClosed,
        note: tenantBusinessHoursOverrides.note,
      })
      .from(tenantBusinessHoursOverrides)
      .where(
        and(
          eq(tenantBusinessHoursOverrides.tenantId, tenantId),
          eq(tenantBusinessHoursOverrides.locationId, locationId),
          gte(tenantBusinessHoursOverrides.date, today),
        ),
      )
      .orderBy(asc(tenantBusinessHoursOverrides.date)),
  );

// -----
// Writes: one row per Location and date (or
// weekday), so saving again replaces it.
// -----
export const upsertHoursOverrideEffect = (
  db: DbConnectType,
  tenantId: string,
  locationId: string,
  override: HoursOverride,
): Effect.Effect<HoursOverride, DbError> =>
  query(() =>
    db
      .insert(tenantBusinessHoursOverrides)
      .values({ tenantId, locationId, ...override })
      .onConflictDoUpdate({
        target: [tenantBusinessHoursOverrides.locationId, tenantBusinessHoursOverrides.date],
        set: {
          opensAt: override.opensAt,
          closesAt: override.closesAt,
          isClosed: override.isClosed,
          note: override.note,
          updatedAt: new Date(),
        },
      })
      .returning({
        date: tenantBusinessHoursOverrides.date,
        opensAt: tenantBusinessHoursOverrides.opensAt,
        closesAt: tenantBusinessHoursOverrides.closesAt,
        isClosed: tenantBusinessHoursOverrides.isClosed,
        note: tenantBusinessHoursOverrides.note,
      }),
  ).pipe(Effect.map(([row]) => row));

export const deleteHoursOverrideEffect = (
  db: DbConnectType,
  tenantId: string,
  locationId: string,
  date: string,
): Effect.Effect<boolean, DbError> =>
  query(() =>
    db
      .delete(tenantBusinessHoursOverrides)
      .where(
        and(
          eq(tenantBusinessHoursOverrides.tenantId, tenantId),
          eq(tenantBusinessHoursOverrides.locationId, locationId),
          eq(tenantBusinessHoursOverrides.date, date),
        ),
      )
      .returning({ id: tenantBusinessHoursOverrides.id }),
  ).pipe(Effect.map((rows) => rows.length > 0));

export const upsertBusinessHoursEffect = (
  db: DbConnectType,
  tenantId: string,
  locationId: string,
  hours: BusinessHours,
): Effect.Effect<BusinessHours, DbError> =>
  query(() =>
    db
      .insert(tenantBusinessHours)
      .values({ tenantId, locationId, ...hours })
      .onConflictDoUpdate({
        target: [tenantBusinessHours.locationId, tenantBusinessHours.dayOfWeek],
        set: {
          opensAt: hours.opensAt,
          closesAt: hours.closesAt,
          isClosed: hours.isClosed,
          updatedAt: new Date(),
        },
      })
      .returning({
        dayOfWeek: tenantBusinessHours.dayOfWeek,
        opensAt: tenantBusinessHours.opensAt,
        closesAt: tenantBusinessHours.closesAt,
        isClosed: tenantBusinessHours.isClosed,
      }),
  ).pipe(Effect.map(([row]) => row));
