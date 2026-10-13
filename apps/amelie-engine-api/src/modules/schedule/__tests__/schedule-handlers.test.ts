import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { tenantBusinessHours, tenantBusinessHoursOverrides, tenantLocations } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Effect } from "effect";
import { runEffect } from "#/lib/effect-query";
import {
  getTenantScheduleSvc,
  removeHoursOverrideSvc,
  setBusinessHoursSvc,
  setHoursOverrideSvc,
} from "#/modules/schedule";
import { createTestDb, defaultLocationId, insertLocation, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let otherCafeId: string;
let sorellaLocationId: string;

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella");
  otherCafeId = await insertTenant(db, "Other Cafe", "other-cafe");
  sorellaLocationId = await defaultLocationId(db, sorellaId);
  await db.insert(tenantBusinessHours).values([
    { tenantId: sorellaId, locationId: sorellaLocationId, dayOfWeek: 1, isClosed: true },
    { tenantId: sorellaId, locationId: sorellaLocationId, dayOfWeek: 6, opensAt: "08:00", closesAt: "16:00" },
  ]);
  await db.insert(tenantBusinessHoursOverrides).values([
    { tenantId: sorellaId, locationId: sorellaLocationId, date: "2000-01-01", isClosed: true, note: "Long gone" },
    { tenantId: sorellaId, locationId: sorellaLocationId, date: "2999-12-25", isClosed: true, note: "Christmas" },
  ]);
});

describe("business hours rules", () => {
  it("rejects an open day without times", async () => {
    await expect(
      db.insert(tenantBusinessHours).values({ tenantId: sorellaId, locationId: sorellaLocationId, dayOfWeek: 2 }),
    ).rejects.toMatchObject({ cause: { constraint: "tenant_business_hours_times_shape" } });
  });
});

describe("getTenantScheduleSvc", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // -----
  // Saturday 10:00 in New York; only Date is
  // faked so PGlite's timers still run.
  // -----
  it("returns now, the week and upcoming special dates in the Tenant's timezone", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T14:00:00Z"));

    const schedule = await runEffect(getTenantScheduleSvc(db, sorellaId));

    expect(schedule).toMatchObject({
      timezone: "America/New_York",
      today: "2026-10-03",
      now: "10:00",
      openNow: "open now, until 16:00",
    });
    expect(schedule.weekly[0]).toEqual({
      weekday: "Sunday",
      isSet: false,
      isClosed: false,
      opensAt: null,
      closesAt: null,
    });
    expect(schedule.weekly[1]).toMatchObject({ weekday: "Monday", isSet: true, isClosed: true });
    expect(schedule.weekly[6]).toMatchObject({ weekday: "Saturday", opensAt: "08:00", closesAt: "16:00" });
    expect(schedule.next7Days.map((day) => day.date)).toEqual([
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
    ]);
    expect(schedule.specialDates).toEqual([
      { date: "2999-12-25", isClosed: true, opensAt: null, closesAt: null, note: "Christmas" },
    ]);
  });

  it("never returns another Tenant's hours", async () => {
    const schedule = await runEffect(getTenantScheduleSvc(db, otherCafeId));

    expect(schedule.weekly.every((day) => !day.isSet)).toBe(true);
    expect(schedule.specialDates).toEqual([]);
    expect(schedule.openNow).toBe("today's hours are not set");
  });
});


describe("a Tenant with two Locations", () => {
  let tenantId: string;
  let downtownId: string;
  let airportId: string;

  beforeAll(async () => {
    tenantId = await insertTenant(db, "Two Branch Cafe", "two-branch");
    downtownId = await defaultLocationId(db, tenantId);
    airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport", timezone: "Asia/Tokyo" });
    await db.insert(tenantBusinessHours).values([
      { tenantId, locationId: downtownId, dayOfWeek: 6, opensAt: "08:00", closesAt: "16:00" },
      { tenantId, locationId: airportId, dayOfWeek: 6, opensAt: "05:00", closesAt: "23:00" },
    ]);
    await db.insert(tenantBusinessHoursOverrides).values([
      { tenantId, locationId: airportId, date: "2999-12-25", isClosed: true, note: "Airport closed" },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns different hours for each Location", async () => {
    const downtown = await runEffect(getTenantScheduleSvc(db, tenantId, downtownId));
    const airport = await runEffect(getTenantScheduleSvc(db, tenantId, airportId));

    expect(downtown.weekly[6]).toMatchObject({ opensAt: "08:00", closesAt: "16:00" });
    expect(airport.weekly[6]).toMatchObject({ opensAt: "05:00", closesAt: "23:00" });
    expect(downtown.specialDates).toEqual([]);
    expect(airport.specialDates).toHaveLength(1);
  });

  // -----
  // 2026-10-03 14:00Z is Saturday 10:00 in New
  // York but 23:00 in Tokyo.
  // -----
  it("decides open now by the Location's timezone, not the Tenant's", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T14:00:00Z"));

    const downtown = await runEffect(getTenantScheduleSvc(db, tenantId, downtownId));
    const airport = await runEffect(getTenantScheduleSvc(db, tenantId, airportId));

    expect(downtown).toMatchObject({ timezone: "America/New_York", now: "10:00", openNow: "open now, until 16:00" });
    expect(airport).toMatchObject({ timezone: "Asia/Tokyo", today: "2026-10-03", now: "23:00" });
    expect(airport.openNow).toMatch(/^closed now/);
  });

  it("asks which Location when none is given, listing the options", async () => {
    const failure = await Effect.runPromise(Effect.flip(getTenantScheduleSvc(db, tenantId)));

    expect(failure).toMatchObject({ _tag: "NeedsLocation" });
    expect(failure).toHaveProperty("locations", [
      { id: downtownId, name: "Two Branch Cafe" },
      { id: airportId, name: "Airport" },
    ]);
  });

  it("does not accept another Tenant's Location", async () => {
    const foreign = await defaultLocationId(db, otherCafeId);

    const failure = await Effect.runPromise(Effect.flip(getTenantScheduleSvc(db, tenantId, foreign)));

    expect(failure).toMatchObject({ _tag: "NotFound" });
  });

  it("does not accept an archived Location", async () => {
    const closedId = await insertLocation(db, tenantId, { name: "Closed", slug: "closed" });
    await db.update(tenantLocations).set({ archivedAt: new Date() }).where(eq(tenantLocations.id, closedId));

    const failure = await Effect.runPromise(Effect.flip(getTenantScheduleSvc(db, tenantId, closedId)));

    expect(failure).toMatchObject({ _tag: "NotFound" });
  });

  it("saves weekly hours and special dates to the chosen Location only", async () => {
    await runEffect(
      setBusinessHoursSvc(db, tenantId, { dayOfWeek: 2, opensAt: "09:00", closesAt: "12:00", isClosed: false }, airportId),
    );
    await runEffect(
      setBusinessHoursSvc(db, tenantId, { dayOfWeek: 2, opensAt: "09:30", closesAt: "12:00", isClosed: false }, airportId),
    );
    await runEffect(
      setHoursOverrideSvc(db, tenantId, { date: "2999-01-01", opensAt: null, closesAt: null, isClosed: true, note: "New year" }, downtownId),
    );

    const downtown = await runEffect(getTenantScheduleSvc(db, tenantId, downtownId));
    const airport = await runEffect(getTenantScheduleSvc(db, tenantId, airportId));
    expect(airport.weekly[2]).toMatchObject({ opensAt: "09:30" });
    expect(downtown.weekly[2].isSet).toBe(false);
    expect(downtown.specialDates.map((d) => d.date)).toContain("2999-01-01");
    expect(airport.specialDates.map((d) => d.date)).not.toContain("2999-01-01");

    await runEffect(removeHoursOverrideSvc(db, tenantId, "2999-01-01", downtownId));
    const after = await runEffect(getTenantScheduleSvc(db, tenantId, downtownId));
    expect(after.specialDates).toEqual([]);
  });

  it("refuses a write when there are several Locations and none is chosen", async () => {
    const failure = await Effect.runPromise(
      Effect.flip(setBusinessHoursSvc(db, tenantId, { dayOfWeek: 3, opensAt: "09:00", closesAt: "12:00", isClosed: false })),
    );

    expect(failure).toMatchObject({ _tag: "NeedsLocation" });
  });
});

describe("a Tenant with one Location", () => {
  it("uses its Location silently, with no locationId given", async () => {
    const schedule = await runEffect(getTenantScheduleSvc(db, sorellaId));
    expect(schedule.weekly[6]).toMatchObject({ opensAt: "08:00" });

    await runEffect(setBusinessHoursSvc(db, sorellaId, { dayOfWeek: 3, opensAt: "10:00", closesAt: "14:00", isClosed: false }));
    const rows = await db.select().from(tenantBusinessHours).where(eq(tenantBusinessHours.dayOfWeek, 3));
    expect(rows.find((r) => r.tenantId === sorellaId)?.locationId).toBe(sorellaLocationId);
  });
});
