import { describe, expect, it } from "vitest";
import { countryFromLocale } from "../sign-up-region";

describe("countryFromLocale", () => {
  it("reads the region of a full locale", () => {
    expect(countryFromLocale("en-PH")).toBe("PH");
    expect(countryFromLocale("fr-CA")).toBe("CA");
  });

  it("reads the region behind a script", () => {
    expect(countryFromLocale("zh-Hant-TW")).toBe("TW");
  });

  it("is blank when the locale has no region", () => {
    expect(countryFromLocale("en")).toBe("");
  });

  it("is blank when the region is not in the shared list", () => {
    expect(countryFromLocale("en-ZZ")).toBe("");
  });

  it("is blank for a missing or malformed locale", () => {
    expect(countryFromLocale(undefined)).toBe("");
    expect(countryFromLocale("")).toBe("");
    expect(countryFromLocale("not a locale!")).toBe("");
  });
});
