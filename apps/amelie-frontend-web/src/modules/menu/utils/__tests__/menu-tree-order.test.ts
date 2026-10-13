import { describe, expect, it } from "vitest";
import { findItemCategory, moveCategory, moveItem, treeOrderSignature, type TreeOrder } from "../menu-tree-order";

const order = (): TreeOrder => ({
  categories: ["coffee", "pastry", "wine"],
  items: { coffee: ["latte", "mocha"], pastry: ["scone"], wine: [] },
});

describe("moveCategory", () => {
  it("puts a category before another", () => {
    expect(moveCategory(order(), "wine", "coffee", "before").categories).toEqual(["wine", "coffee", "pastry"]);
  });

  it("puts a category after another", () => {
    expect(moveCategory(order(), "coffee", "pastry", "after").categories).toEqual(["pastry", "coffee", "wine"]);
  });

  it("leaves the order alone when dropped on itself", () => {
    const start = order();
    expect(moveCategory(start, "coffee", "coffee", "after")).toBe(start);
  });
});

describe("moveItem", () => {
  it("reorders inside a category", () => {
    const next = moveItem(order(), "mocha", { kind: "item", itemId: "latte", position: "before" });
    expect(next.items.coffee).toEqual(["mocha", "latte"]);
  });

  it("moves an item to another category, next to an item there", () => {
    const next = moveItem(order(), "latte", { kind: "item", itemId: "scone", position: "after" });
    expect(next.items.coffee).toEqual(["mocha"]);
    expect(next.items.pastry).toEqual(["scone", "latte"]);
  });

  it("appends an item dropped on a category, even an empty one", () => {
    const next = moveItem(order(), "latte", { kind: "category", categoryId: "wine" });
    expect(next.items.coffee).toEqual(["mocha"]);
    expect(next.items.wine).toEqual(["latte"]);
  });

  it("leaves the order alone when dropped on itself", () => {
    const start = order();
    expect(moveItem(start, "latte", { kind: "item", itemId: "latte", position: "after" })).toBe(start);
  });

  it("ignores an unknown item", () => {
    const start = order();
    expect(moveItem(start, "ghost", { kind: "category", categoryId: "wine" })).toBe(start);
  });
});

describe("findItemCategory and treeOrderSignature", () => {
  it("finds the category an item is in", () => {
    expect(findItemCategory(order(), "scone")).toBe("pastry");
    expect(findItemCategory(order(), "ghost")).toBeNull();
  });

  it("changes when the order changes", () => {
    const moved = moveCategory(order(), "wine", "coffee", "before");
    expect(treeOrderSignature(moved)).not.toBe(treeOrderSignature(order()));
  });
});
