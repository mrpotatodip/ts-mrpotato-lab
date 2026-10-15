import { describe, expect, it } from "vitest";

import { toAccentSwatchValue } from "../to-accent-swatch-value";

describe("toAccentSwatchValue", () => {
  it("returns a stored hex as-is", () => {
    expect(toAccentSwatchValue("#b4532a")).toBe("#b4532a");
  });

  it("falls back to light --primary when there is no accent", () => {
    expect(toAccentSwatchValue(null)).toBe("#a9655a");
  });
});
