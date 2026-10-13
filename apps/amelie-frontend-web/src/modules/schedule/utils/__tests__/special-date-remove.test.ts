import { describe, expect, it } from "vitest";
import type { TenantHours } from "@repo/contracts/amelie";
import { withoutSpecialDate } from "../special-date-remove";

const day = (date: string) => ({ date, isClosed: true, opensAt: null, closesAt: null, note: null });

const hours: TenantHours = {
  timezone: "Europe/London",
  weekly: [],
  specialDates: [day("2026-12-25"), day("2026-12-26")],
};

describe("withoutSpecialDate", () => {
  it("drops the removed date", () => {
    expect(withoutSpecialDate(hours, "2026-12-25").specialDates.map((entry) => entry.date)).toEqual(["2026-12-26"]);
  });

  it("keeps the weekly hours", () => {
    expect(withoutSpecialDate(hours, "2026-12-25").weekly).toBe(hours.weekly);
  });
});
