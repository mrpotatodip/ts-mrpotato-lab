import { describe, expect, it } from "vitest";
import type { MenuItemResult } from "@repo/contracts/chat-bots";

import { toChatBotMenuGroups, toChatBotMenuItemPrice } from "../to-chat-bot-menu";

const item = (overrides: Partial<MenuItemResult>): MenuItemResult => ({
  id: "i1",
  name: "Latte",
  description: null,
  price: "4.75",
  currency: "USD",
  variants: null,
  isAvailable: true,
  coverPath: null,
  dietaryTags: [],
  ...overrides,
});

describe("toChatBotMenuItemPrice", () => {
  it("joins the price and currency", () => {
    expect(toChatBotMenuItemPrice(item({}))).toBe("4.75 USD");
  });

  it("lists each variant instead of the lowest price", () => {
    const variants = [
      { name: "Small", price: "4.75" },
      { name: "Large", price: "6.25" },
    ];
    expect(toChatBotMenuItemPrice(item({ variants }))).toBe("Small 4.75 USD · Large 6.25 USD");
  });

  it("drops the currency when there is none", () => {
    expect(toChatBotMenuItemPrice(item({ currency: null }))).toBe("4.75");
  });

  it("is null when no price is known", () => {
    expect(toChatBotMenuItemPrice(item({ price: null, currency: null }))).toBeNull();
  });
});

describe("toChatBotMenuGroups", () => {
  const found = (id: string, category: string, categoryNote: string | null) => ({
    ...item({ id }),
    category,
    categoryNote,
  });

  it("groups by category in order of first appearance, keeping the note once", () => {
    const groups = toChatBotMenuGroups([
      found("a", "Pastries", null),
      found("b", "Sandwiches", "Swap in gluten-free bread +2."),
      found("c", "Sandwiches", "Swap in gluten-free bread +2."),
    ]);
    expect(groups.map((group) => group.category)).toEqual(["Pastries", "Sandwiches"]);
    expect(groups[1]).toMatchObject({ note: "Swap in gluten-free bread +2." });
    expect(groups[1].items.map((entry) => entry.id)).toEqual(["b", "c"]);
  });

  it("is empty for no items", () => {
    expect(toChatBotMenuGroups([])).toEqual([]);
  });
});
