import { describe, expect, it } from "vitest";
import { moveId } from "../move-id";

describe("moveId", () => {
  it("moves an id down one place", () => {
    expect(moveId(["a", "b", "c"], "a", 1)).toEqual(["b", "a", "c"]);
  });

  it("moves an id up one place", () => {
    expect(moveId(["a", "b", "c"], "c", -1)).toEqual(["a", "c", "b"]);
  });

  it("leaves the order at either end", () => {
    const ids = ["a", "b"];
    expect(moveId(ids, "a", -1)).toBe(ids);
    expect(moveId(ids, "b", 1)).toBe(ids);
  });

  it("leaves the order for an unknown id", () => {
    const ids = ["a", "b"];
    expect(moveId(ids, "z", 1)).toBe(ids);
  });
});
