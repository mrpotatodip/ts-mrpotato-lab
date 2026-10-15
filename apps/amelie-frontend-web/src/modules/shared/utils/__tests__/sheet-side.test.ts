import { describe, expect, it } from "vitest";

import { isOwnAnimationEnd, oppositeSheetSide, sheetSideWiggleClassName } from "../sheet-side";

describe("oppositeSheetSide", () => {
  it("swaps left and right", () => {
    expect(oppositeSheetSide("right")).toBe("left");
    expect(oppositeSheetSide("left")).toBe("right");
  });
});

describe("sheetSideWiggleClassName", () => {
  it("names the landing wiggle", () => {
    expect(sheetSideWiggleClassName("left")).toBe("motion-reduce:animate-none animate-sheet-wiggle-left");
    expect(sheetSideWiggleClassName("right")).toBe("motion-reduce:animate-none animate-sheet-wiggle-right");
    expect(sheetSideWiggleClassName(null)).toBeUndefined();
  });
});

describe("isOwnAnimationEnd", () => {
  it("ignores bubbling child animations", () => {
    const panel = {};
    const icon = {};
    expect(isOwnAnimationEnd({ target: panel, currentTarget: panel })).toBe(true);
    expect(isOwnAnimationEnd({ target: icon, currentTarget: panel })).toBe(false);
  });
});
