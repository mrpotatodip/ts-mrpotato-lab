import { describe, expect, it } from "vitest";

import { FAQ_NO_CATEGORY } from "../../constants";
import { FaqSearchSchema } from "../faq-search-schemas";

describe("FaqSearchSchema", () => {
  it("reads a category id", () => {
    expect(FaqSearchSchema.parse({ category: "00000000-0000-4000-8000-000000000001" })).toEqual({
      category: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("reads General", () => {
    expect(FaqSearchSchema.parse({ category: FAQ_NO_CATEGORY })).toEqual({ category: FAQ_NO_CATEGORY });
  });

  it("ignores a blank or missing category", () => {
    expect(FaqSearchSchema.parse({}).category).toBeUndefined();
    expect(FaqSearchSchema.parse({ category: "   " }).category).toBeUndefined();
  });
});
