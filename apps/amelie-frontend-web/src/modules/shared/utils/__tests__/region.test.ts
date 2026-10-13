import { describe, expect, it } from "vitest";
import { COUNTRY_OPTIONS, countryName, currencyForCountry } from "../region";

describe("currencyForCountry", () => {
  it("gives the country's currency", () => {
    expect(currencyForCountry("PH")).toBe("PHP");
    expect(currencyForCountry("DE")).toBe("EUR");
  });

  it("is blank for no country or an unlisted one", () => {
    expect(currencyForCountry("")).toBe("");
    expect(currencyForCountry("ZZ")).toBe("");
  });
});

describe("countryName", () => {
  it("names a country in English", () => {
    expect(countryName("PH")).toBe("Philippines");
  });
});

describe("COUNTRY_OPTIONS", () => {
  it("is sorted by name", () => {
    const names = COUNTRY_OPTIONS.map((option) => option.name);

    expect(names).toEqual(names.toSorted((a, b) => a.localeCompare(b)));
  });
});
