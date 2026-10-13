import { describe, expect, it } from "vitest";

import { formatDateTime } from "../format-date-time";

describe("formatDateTime", () => {
  it("shows the date and the time", () => {
    const text = formatDateTime("2026-01-05T15:04:00Z");
    expect(text).toMatch(/2026/);
    expect(text).toMatch(/\d{1,2}:\d{2}/);
  });

  it("reads the same everywhere when stable, in UTC and en-US", () => {
    expect(formatDateTime("2026-01-05T15:04:00Z", true)).toBe("Jan 5, 2026, 3:04 PM");
  });
});
