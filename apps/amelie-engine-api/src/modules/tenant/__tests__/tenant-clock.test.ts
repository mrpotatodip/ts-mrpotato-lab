import { afterEach, describe, expect, it, vi } from "vitest";
import { tenantClock } from "#/modules/tenant/lib";

describe("tenantClock", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the Tenant's timezone, not UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T02:05:00Z"));

    expect(tenantClock("America/New_York")).toEqual({ date: "2026-10-03", time: "22:05" });
    expect(tenantClock("Australia/Brisbane")).toEqual({ date: "2026-10-04", time: "12:05" });
  });
});
