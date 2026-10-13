import { describe, expect, it } from "vitest";

import { toFaqBodyInput } from "../faq-body";

describe("toFaqBodyInput", () => {
  it("turns the General choice into a null category", () => {
    expect(toFaqBodyInput({ categoryId: "general", scope: "all-locations", question: "Q", answer: "A" })).toEqual({
      categoryId: null,
      countryId: null,
      locationId: null,
      question: "Q",
      answer: "A",
    });
  });

  it("keeps a real category and splits the scope", () => {
    expect(toFaqBodyInput({ categoryId: "cat-1", scope: "country:c-1", question: "Q", answer: "A" })).toMatchObject({
      categoryId: "cat-1",
      countryId: "c-1",
      locationId: null,
    });
  });
});
