import { describe, expect, it } from "vitest";
import type { Country, Location } from "@repo/contracts/amelie";
import { activeCountries } from "../active-countries";
import { addableCountryOptions } from "../addable-country-options";
import { chooseCountry } from "../choose-country";
import { countOpenLocationsIn } from "../count-open-locations";
import { countryLabel } from "../country-label";
import { withCountry } from "../with-country";

const US_ID = "11111111-1111-4111-8111-111111111111";
const CA_ID = "22222222-2222-4222-8222-222222222222";

const us: Country = { id: US_ID, country: "US", currency: "USD", archivedAt: null };
const ca: Country = { id: CA_ID, country: "CA", currency: "CAD", archivedAt: null };
const mx: Country = { id: "33333333-3333-4333-8333-333333333333", country: "MX", currency: "MXN", archivedAt: "2026-01-01T00:00:00.000Z" };

const location = (id: string, countryId: string, archivedAt: string | null = null): Location => ({
  id,
  name: id,
  slug: id,
  countryId,
  address: null,
  phone: null,
  timezone: "America/New_York",
  archivedAt,
});

describe("withCountry", () => {
  it("adds ?countryId= or &countryId= to an engine path", () => {
    expect(withCountry("/menu", CA_ID)).toBe(`/menu?countryId=${CA_ID}`);
    expect(withCountry("/menu?x=1", CA_ID)).toBe(`/menu?x=1&countryId=${CA_ID}`);
  });

  it("leaves the path alone without a Country", () => {
    expect(withCountry("/menu", undefined)).toBe("/menu");
  });
});

describe("activeCountries", () => {
  it("drops archived Countries and copes with no data yet", () => {
    expect(activeCountries([us, mx, ca])).toEqual([us, ca]);
    expect(activeCountries(undefined)).toEqual([]);
  });
});

describe("chooseCountry", () => {
  it("picks nothing while the cafe has one Country, so the engine uses it", () => {
    expect(chooseCountry([us], CA_ID)).toBeUndefined();
    expect(chooseCountry([], null)).toBeUndefined();
  });

  it("picks the chosen Country, else the oldest", () => {
    expect(chooseCountry([us, ca], CA_ID)).toEqual(ca);
    expect(chooseCountry([us, ca], null)).toEqual(us);
  });

  it("falls back to the oldest when the chosen one was archived", () => {
    expect(chooseCountry([us, ca], mx.id)).toEqual(us);
  });
});

describe("addableCountryOptions", () => {
  it("lists every country the cafe is not selling in, and keeps archived ones addable", () => {
    const codes = addableCountryOptions([us, ca, mx]).map((option) => option.code);

    expect(codes).not.toContain("US");
    expect(codes).not.toContain("CA");
    expect(codes).toContain("MX");
    expect(codes).toContain("FR");
  });
});

describe("countOpenLocationsIn", () => {
  it("counts only open Locations of that Country", () => {
    const all = [location("a", US_ID), location("b", US_ID, "2026-01-01T00:00:00.000Z"), location("c", CA_ID)];

    expect(countOpenLocationsIn(all, US_ID)).toBe(1);
    expect(countOpenLocationsIn(all, CA_ID)).toBe(1);
    expect(countOpenLocationsIn(undefined, CA_ID)).toBe(0);
  });
});

describe("countryLabel", () => {
  it("names the country and its currency", () => {
    expect(countryLabel(ca)).toBe("Canada (CAD)");
  });
});
