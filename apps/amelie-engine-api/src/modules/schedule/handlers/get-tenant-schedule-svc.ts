import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NeedsLocation, NotFound } from "#/lib/effect-query";
import { resolveLocationSvc } from "#/modules/location";
import { tenantClock } from "#/modules/tenant";
import {
  listBusinessHoursEffect,
  listUpcomingHoursOverridesEffect,
} from "#/modules/schedule/queries";
import {
  buildTenantSchedule,
  buildWeeklyHours,
  describeOpenNow,
  toSpecialDates,
} from "#/modules/schedule/lib";
import type { TenantSchedule } from "#/modules/schedule/types";

// -----
// One Location's hours, in its own timezone:
// now, the week, and upcoming special dates.
// No locationId means the Tenant's only one.
// -----
export const getTenantScheduleSvc = (
  db: DbConnectType,
  tenantId: string,
  locationId?: string,
): Effect.Effect<TenantSchedule, DbError | NotFound | NeedsLocation> =>
  Effect.gen(function* () {
    const location = yield* resolveLocationSvc(db, tenantId, locationId);
    const { timezone } = location;
    const clock = tenantClock(timezone);
    const [hours, overrides] = yield* Effect.all(
      [
        listBusinessHoursEffect(db, tenantId, location.id),
        listUpcomingHoursOverridesEffect(db, tenantId, location.id, clock.date),
      ],
      { concurrency: "unbounded" },
    );
    const next7Days = buildTenantSchedule(hours, overrides, clock.date);
    return {
      location: { id: location.id, name: location.name },
      timezone,
      today: clock.date,
      now: clock.time,
      openNow: describeOpenNow(next7Days, clock),
      weekly: buildWeeklyHours(hours),
      next7Days,
      specialDates: toSpecialDates(overrides),
    };
  });
