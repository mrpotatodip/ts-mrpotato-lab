import { describe, expect, it } from "vitest";
import { toThreadTitle } from "../to-thread-title";

describe("toThreadTitle", () => {
  it("returns the stored Title", () => {
    expect(toThreadTitle("How many?")).toBe("How many?");
  });

  it("falls back when Title is missing", () => {
    expect(toThreadTitle(null)).toBe("Chat");
    expect(toThreadTitle("   ")).toBe("Chat");
  });
});
