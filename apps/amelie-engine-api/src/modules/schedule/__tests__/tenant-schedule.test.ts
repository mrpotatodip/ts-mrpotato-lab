import { describe, expect, it } from "vitest";
import { buildTenantSchedule, describeOpenNow } from "#/modules/schedule/lib";
import type { BusinessHours, HoursOverride } from "#/modules/schedule/types";

const hours: BusinessHours[] = [
  { dayOfWeek: 0, opensAt: "08:00:00", closesAt: "14:00:00", isClosed: false },
  { dayOfWeek: 1, opensAt: null, closesAt: null, isClosed: true },
  ...[2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    opensAt: "08:00:00",
    closesAt: "16:00:00",
    isClosed: false,
  })),
];

const christmas: HoursOverride = {
  date: "2026-12-25",
  opensAt: null,
  closesAt: null,
  isClosed: true,
  note: "Christmas",
};

describe("buildTenantSchedule", () => {
  it("lays the weekly hours onto the next 7 real dates", () => {
    const schedule = buildTenantSchedule(hours, [], "2026-10-04");

    expect(schedule.map((d) => [d.weekday, d.date, d.isClosed ? "closed" : `${d.opensAt}-${d.closesAt}`])).toEqual([
      ["Sunday", "2026-10-04", "08:00-14:00"],
      ["Monday", "2026-10-05", "closed"],
      ["Tuesday", "2026-10-06", "08:00-16:00"],
      ["Wednesday", "2026-10-07", "08:00-16:00"],
      ["Thursday", "2026-10-08", "08:00-16:00"],
      ["Friday", "2026-10-09", "08:00-16:00"],
      ["Saturday", "2026-10-10", "08:00-16:00"],
    ]);
  });

  it("lets a special date replace that day's weekly hours", () => {
    const schedule = buildTenantSchedule(hours, [christmas], "2026-12-22");
    const friday = schedule.find((d) => d.date === "2026-12-25");

    expect(friday).toMatchObject({ weekday: "Friday", isClosed: true, isSpecial: true, note: "Christmas" });
    expect(schedule.find((d) => d.date === "2026-12-24")).toMatchObject({ opensAt: "08:00", isSpecial: false });
  });

  it("marks days with no hours as not set", () => {
    const [today] = buildTenantSchedule([], [], "2026-10-04");

    expect(today).toMatchObject({ isSet: false, opensAt: null });
  });
});

describe("describeOpenNow", () => {
  const sunday = buildTenantSchedule(hours, [], "2026-10-04");

  it("says open with the closing time during opening hours", () => {
    expect(describeOpenNow(sunday, { date: "2026-10-04", time: "10:32" })).toBe("open now, until 14:00");
  });

  it("says when it opens later today before opening", () => {
    expect(describeOpenNow(sunday, { date: "2026-10-04", time: "07:15" })).toBe(
      "closed now, opens today at 08:00",
    );
  });

  it("says it already closed today, then skips a closed Monday", () => {
    expect(describeOpenNow(sunday, { date: "2026-10-04", time: "20:44" })).toBe(
      "closed now, closed at 14:00 today, opens Tuesday 2026-10-06 at 08:00",
    );
  });

  it("names the next opening on a closed day", () => {
    const monday = buildTenantSchedule(hours, [], "2026-10-05");

    expect(describeOpenNow(monday, { date: "2026-10-05", time: "11:00" })).toBe(
      "closed all day today, opens Tuesday 2026-10-06 at 08:00",
    );
  });

  it("is closed on a special date even within weekly hours", () => {
    const schedule = buildTenantSchedule(hours, [christmas], "2026-12-25");

    expect(describeOpenNow(schedule, { date: "2026-12-25", time: "10:00" })).toBe(
      "closed all day today, opens Saturday 2026-12-26 at 08:00",
    );
  });

  it("says the hours are not set when there are none", () => {
    const schedule = buildTenantSchedule([], [], "2026-10-04");

    expect(describeOpenNow(schedule, { date: "2026-10-04", time: "10:00" })).toBe("today's hours are not set");
  });
});
