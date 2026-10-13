import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import { Invalid, NotFound, type DbError, type NeedsLocation } from "#/lib/effect-query";
import { resolveLocationSvc } from "#/modules/location";
import { tenantClock } from "#/modules/tenant";
import {
  deleteHoursOverrideEffect,
  upsertBusinessHoursEffect,
  upsertHoursOverrideEffect,
} from "#/modules/schedule/queries";
import { buildWeeklyHours, toSpecialDates } from "#/modules/schedule/lib";
import {
  SCHEDULE_OVERRIDE_NOT_FOUND,
  SCHEDULE_OVERRIDE_PAST,
} from "#/modules/schedule/constants";
import type {
  BusinessHours,
  HoursOverride,
  SpecialDate,
  WeeklyHours,
} from "#/modules/schedule/types";

// -----
// "Past" is by the Location's own calendar,
// so today is still allowed. Writes name a
// Location, or use the Tenant's only one.
// -----
export const setHoursOverrideSvc = (
  db: DbConnectType,
  tenantId: string,
  override: HoursOverride,
  locationId?: string,
): Effect.Effect<SpecialDate, DbError | NotFound | Invalid | NeedsLocation> =>
  Effect.gen(function* () {
    const location = yield* resolveLocationSvc(db, tenantId, locationId);
    if (override.date < tenantClock(location.timezone).date) {
      return yield* new Invalid({ message: SCHEDULE_OVERRIDE_PAST });
    }
    const saved = yield* upsertHoursOverrideEffect(db, tenantId, location.id, override);
    return toSpecialDates([saved])[0];
  });

export const removeHoursOverrideSvc = (
  db: DbConnectType,
  tenantId: string,
  date: string,
  locationId?: string,
): Effect.Effect<{ date: string }, DbError | NotFound | NeedsLocation> =>
  Effect.gen(function* () {
    const location = yield* resolveLocationSvc(db, tenantId, locationId);
    const removed = yield* deleteHoursOverrideEffect(db, tenantId, location.id, date);
    if (!removed) return yield* new NotFound({ message: SCHEDULE_OVERRIDE_NOT_FOUND });
    return { date };
  });

export const setBusinessHoursSvc = (
  db: DbConnectType,
  tenantId: string,
  hours: BusinessHours,
  locationId?: string,
): Effect.Effect<WeeklyHours, DbError | NotFound | NeedsLocation> =>
  resolveLocationSvc(db, tenantId, locationId).pipe(
    Effect.flatMap((location) => upsertBusinessHoursEffect(db, tenantId, location.id, hours)),
    Effect.map((saved) => buildWeeklyHours([saved])[saved.dayOfWeek]),
  );
