import { describe, expect, it } from "vitest";
import { toggleMenuFocus } from "../menu-focus";

describe("toggleMenuFocus", () => {
  it("focuses a category when nothing is focused", () => {
    expect(toggleMenuFocus(null, { categoryId: "coffee", itemId: null })).toEqual({ categoryId: "coffee", itemId: null });
  });

  it("clears the focus when the same category is chosen again", () => {
    expect(toggleMenuFocus({ categoryId: "coffee", itemId: null }, { categoryId: "coffee", itemId: null })).toBeNull();
  });

  it("clears the focus when the same item is chosen again", () => {
    expect(toggleMenuFocus({ categoryId: "coffee", itemId: "latte" }, { categoryId: "coffee", itemId: "latte" })).toBeNull();
  });

  it("switches from a category to one of its items", () => {
    expect(toggleMenuFocus({ categoryId: "coffee", itemId: null }, { categoryId: "coffee", itemId: "latte" })).toEqual({
      categoryId: "coffee",
      itemId: "latte",
    });
  });
});
