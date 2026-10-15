import { describe, expect, it } from "vitest";
import type { Faq, FaqCategory } from "@repo/contracts/amelie";

import { FAQ_NO_CATEGORY } from "../../constants";
import { faqGroupFor, faqGroups, resolveFaqCategoryKey } from "../faq-groups";

const ORDERS = "00000000-0000-4000-8000-000000000001";
const HOURS = "00000000-0000-4000-8000-000000000002";

const categories: FaqCategory[] = [
  { id: ORDERS, name: "Orders" },
  { id: HOURS, name: "Hours" },
];

const faq = (id: string, categoryId: string | null): Faq => ({
  id,
  categoryId,
  category: categoryId === ORDERS ? "Orders" : categoryId === HOURS ? "Hours" : null,
  locationId: null,
  countryId: null,
  question: "Q",
  answer: "A",
});

describe("faqGroups", () => {
  it("keeps empty categories so each one can have its own page", () => {
    const groups = faqGroups([faq("1", null)], categories);
    expect(groups.map((group) => [group.key, group.faqs.length])).toEqual([
      [FAQ_NO_CATEGORY, 1],
      [ORDERS, 0],
      [HOURS, 0],
    ]);
  });
});

describe("resolveFaqCategoryKey", () => {
  it("uses General when the key is missing or unknown", () => {
    expect(resolveFaqCategoryKey(categories, undefined)).toBe(FAQ_NO_CATEGORY);
    expect(resolveFaqCategoryKey(categories, "missing")).toBe(FAQ_NO_CATEGORY);
  });

  it("keeps a known category", () => {
    expect(resolveFaqCategoryKey(categories, ORDERS)).toBe(ORDERS);
    expect(resolveFaqCategoryKey(categories, FAQ_NO_CATEGORY)).toBe(FAQ_NO_CATEGORY);
  });
});

describe("faqGroupFor", () => {
  it("returns the matching group", () => {
    const groups = faqGroups([], categories);
    expect(faqGroupFor(groups, HOURS).title).toBe("Hours");
  });
});
