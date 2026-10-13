import { describe, expect, it } from "vitest";

import {
  countUnavailable,
  flattenMenuItems,
  latestByCreatedAt,
  sortByLastMessage,
  sumActivity,
} from "../dashboard-overview";

describe("sortByLastMessage", () => {
  it("puts the newest chat first without changing the input", () => {
    const threads = [
      { id: "a", lastMessageAt: "2026-01-01T00:00:00Z" },
      { id: "b", lastMessageAt: "2026-03-01T00:00:00Z" },
      { id: "c", lastMessageAt: "2026-02-01T00:00:00Z" },
    ];
    expect(sortByLastMessage(threads).map((thread) => thread.id)).toEqual(["b", "c", "a"]);
    expect(threads[0].id).toBe("a");
  });
});

describe("latestByCreatedAt", () => {
  it("returns the newest item, or undefined for none", () => {
    expect(
      latestByCreatedAt([
        { id: "old", createdAt: "2026-01-01T00:00:00Z" },
        { id: "new", createdAt: "2026-02-01T00:00:00Z" },
      ])?.id,
    ).toBe("new");
    expect(latestByCreatedAt([])).toBeUndefined();
  });
});

describe("flattenMenuItems", () => {
  it("joins the items of every category", () => {
    const menu = { categories: [{ items: [1, 2] }, { items: [] }, { items: [3] }] };
    expect(flattenMenuItems(menu)).toEqual([1, 2, 3]);
  });
});

describe("countUnavailable", () => {
  it("counts the items marked unavailable", () => {
    expect(countUnavailable([{ isAvailable: true }, { isAvailable: false }, { isAvailable: false }])).toBe(2);
  });
});

describe("sumActivity", () => {
  it("adds up the chats of every day", () => {
    expect(sumActivity([{ day: "Mon", count: 2 }, { day: "Tue", count: 3 }])).toBe(5);
    expect(sumActivity([])).toBe(0);
  });
});
