import { describe, expect, it } from "vitest";
import { toCategoryCandidate, toCategoryFormValues, toItemCandidate, toItemFormValues } from "../menu-form";

describe("toCategoryFormValues", () => {
  it("starts empty when adding", () => {
    expect(toCategoryFormValues(null)).toEqual({ name: "", note: "" });
  });

  it("holds a null note as blank", () => {
    expect(toCategoryFormValues({ name: "Coffee", note: null })).toEqual({ name: "Coffee", note: "" });
  });
});

describe("toCategoryCandidate", () => {
  it("sends a blank note as null", () => {
    expect(toCategoryCandidate({ name: "Coffee", note: "  " })).toEqual({ name: "Coffee", note: null });
  });

  it("keeps a typed note as typed", () => {
    expect(toCategoryCandidate({ name: "Coffee", note: " +2 " }).note).toBe(" +2 ");
  });
});

describe("toItemFormValues", () => {
  it("starts available and empty when adding", () => {
    expect(toItemFormValues(null, "cat-1")).toEqual({
      categoryId: "cat-1",
      name: "",
      description: "",
      price: "",
      variants: [],
      isAvailable: true,
      dietaryTags: [],
    });
  });
});

describe("toItemCandidate", () => {
  const values = { ...toItemFormValues(null, "cat-1"), name: "Latte", price: "4.75" };

  it("sends a single price with no variants", () => {
    const candidate = toItemCandidate(values, { countryId: undefined, countryScoped: false });
    expect(candidate).toMatchObject({ price: "4.75", variants: null, description: null });
  });

  it("drops the price when Variants carry it", () => {
    const candidate = toItemCandidate(
      { ...values, variants: [{ name: "Large", price: "5" }] },
      { countryId: undefined, countryScoped: false },
    );
    expect(candidate).toMatchObject({ price: null, variants: [{ name: "Large", price: "5" }] });
  });

  it("leaves a blank price out when editing in a Country", () => {
    const candidate = toItemCandidate({ ...values, price: "" }, { countryId: "c-1", countryScoped: true });
    expect(candidate).toMatchObject({ price: null, countryId: "c-1" });
  });
});
