import { describe, expect, it } from "vitest";
import { describeHours } from "../describe-hours";
import { toHoursBody, toHoursValues, toSpecialDateNote } from "../hours-form";

describe("toHoursValues", () => {
  it("holds missing times as blank", () => {
    expect(toHoursValues({ isClosed: true, opensAt: null, closesAt: null })).toEqual({ isClosed: true, opensAt: "", closesAt: "" });
  });
});

describe("toHoursBody", () => {
  it("sends no times for a closed day", () => {
    expect(toHoursBody({ isClosed: true, opensAt: "08:00", closesAt: "17:00" })).toEqual({ isClosed: true, opensAt: null, closesAt: null });
  });

  it("sends a blank time as null", () => {
    expect(toHoursBody({ isClosed: false, opensAt: "08:00", closesAt: "" })).toEqual({ isClosed: false, opensAt: "08:00", closesAt: null });
  });
});

describe("toSpecialDateNote", () => {
  it("trims, and sends a blank note as null", () => {
    expect(toSpecialDateNote("  Christmas ")).toBe("Christmas");
    expect(toSpecialDateNote("   ")).toBeNull();
  });
});

describe("describeHours", () => {
  it("says Closed for a closed day", () => {
    expect(describeHours({ isClosed: true, opensAt: null, closesAt: null })).toBe("Closed");
  });

  it("gives the opening times", () => {
    expect(describeHours({ isClosed: false, opensAt: "08:00", closesAt: "17:00" })).toBe("08:00 to 17:00");
  });
});
