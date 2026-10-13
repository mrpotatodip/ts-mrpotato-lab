import { describe, expect, it } from "vitest";
import type { FaqList } from "@repo/contracts/amelie";
import { withCategoryRenamed } from "../faq-category-rename";

const CATEGORY = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";

const faq = (id: string, categoryId: string | null, category: string | null) => ({
  id,
  categoryId,
  category,
  locationId: null,
  countryId: null,
  question: "Q",
  answer: "A",
});

const list: FaqList = {
  categories: [
    { id: CATEGORY, name: "Orders" },
    { id: OTHER, name: "Hours" },
  ],
  faqs: [
    faq("00000000-0000-4000-8000-000000000011", CATEGORY, "Orders"),
    faq("00000000-0000-4000-8000-000000000012", OTHER, "Hours"),
    faq("00000000-0000-4000-8000-000000000013", null, null),
  ],
};

describe("withCategoryRenamed", () => {
  it("renames the category and the FAQs inside it", () => {
    const next = withCategoryRenamed(list, CATEGORY, "Ordering");
    expect(next.categories[0].name).toBe("Ordering");
    expect(next.faqs[0].category).toBe("Ordering");
  });

  it("leaves other categories and General FAQs alone", () => {
    const next = withCategoryRenamed(list, CATEGORY, "Ordering");
    expect(next.categories[1].name).toBe("Hours");
    expect(next.faqs[1].category).toBe("Hours");
    expect(next.faqs[2].category).toBeNull();
  });
});
