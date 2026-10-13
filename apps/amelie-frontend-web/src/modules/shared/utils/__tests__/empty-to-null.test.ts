import { describe, expect, it } from "vitest";
import { emptyToNull } from "../empty-to-null";

describe("emptyToNull", () => {
  it("trims, and turns a blank into null", () => {
    expect(emptyToNull("  Via Roma 1 ")).toBe("Via Roma 1");
    expect(emptyToNull("   ")).toBeNull();
  });
});
