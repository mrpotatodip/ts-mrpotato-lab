import { describe, expect, it } from "vitest";
import { FaqBodySchema, type Country, type Faq, type Location } from "@repo/contracts/amelie";
import { ALL_LOCATIONS, faqBadgeLabel, faqScopeLabel, faqScopeOptions, fromScopeValue, toScopeValue } from "../faq-scope";

const US_ID = "11111111-1111-4111-8111-111111111111";
const CA_ID = "22222222-2222-4222-8222-222222222222";
const SEATTLE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TORONTO_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const us: Country = { id: US_ID, country: "US", currency: "USD", archivedAt: null };
const ca: Country = { id: CA_ID, country: "CA", currency: "CAD", archivedAt: null };

const location = (id: string, name: string, countryId: string): Location => ({
  id,
  name,
  slug: name.toLowerCase(),
  countryId,
  address: null,
  phone: null,
  timezone: "America/New_York",
  archivedAt: null,
});

const seattle = location(SEATTLE_ID, "Seattle", US_ID);
const toronto = location(TORONTO_ID, "Toronto", CA_ID);

const faq = (scope: { locationId?: string; countryId?: string }): Faq => ({
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  categoryId: null,
  category: null,
  locationId: scope.locationId ?? null,
  countryId: scope.countryId ?? null,
  question: "Q",
  answer: "A",
});

describe("faqScopeOptions", () => {
  it("lists all locations, each Country with 2+ Countries, then each Location", () => {
    expect(faqScopeOptions([seattle, toronto], [us, ca])).toEqual([
      { value: ALL_LOCATIONS, label: "All locations" },
      { value: `country:${US_ID}`, label: "United States (all locations)" },
      { value: `country:${CA_ID}`, label: "Canada (all locations)" },
      { value: SEATTLE_ID, label: "Seattle only" },
      { value: TORONTO_ID, label: "Toronto only" },
    ]);
  });

  it("leaves the Country choices out for a one-Country café", () => {
    expect(faqScopeOptions([seattle, location("d", "Airport", US_ID)], [us]).map((option) => option.label)).toEqual([
      "All locations",
      "Seattle only",
      "Airport only",
    ]);
  });
});

describe("scope values", () => {
  it("round-trips an FAQ's scope through the select value", () => {
    expect(toScopeValue(null)).toBe(ALL_LOCATIONS);
    expect(toScopeValue(faq({}))).toBe(ALL_LOCATIONS);
    expect(toScopeValue(faq({ countryId: CA_ID }))).toBe(`country:${CA_ID}`);
    expect(toScopeValue(faq({ locationId: TORONTO_ID }))).toBe(TORONTO_ID);
    expect(fromScopeValue(ALL_LOCATIONS)).toEqual({ countryId: null, locationId: null });
    expect(fromScopeValue(`country:${CA_ID}`)).toEqual({ countryId: CA_ID, locationId: null });
    expect(fromScopeValue(TORONTO_ID)).toEqual({ countryId: null, locationId: TORONTO_ID });
  });

  it("builds a body the contract accepts for a Country FAQ and never sets both", () => {
    const body = FaqBodySchema.parse({ categoryId: null, ...fromScopeValue(`country:${CA_ID}`), question: "Q", answer: "A" });

    expect(body).toMatchObject({ countryId: CA_ID, locationId: null });
  });
});

describe("faqScopeLabel and faqBadgeLabel", () => {
  const options = faqScopeOptions([seattle, toronto], [us, ca]);

  it("names the chosen scope for the select", () => {
    expect(faqScopeLabel(`country:${CA_ID}`, options)).toBe("Canada (all locations)");
    expect(faqScopeLabel("gone", options)).toBe("A closed location or country");
  });

  it("badges a Country FAQ and a Location FAQ with 2+ Countries or Locations, and an all-locations FAQ with nothing", () => {
    expect(faqBadgeLabel(faq({ countryId: CA_ID }), [seattle, toronto], [us, ca])).toBe("Canada only");
    expect(faqBadgeLabel(faq({ locationId: TORONTO_ID }), [seattle, toronto], [us, ca])).toBe("Toronto only");
    expect(faqBadgeLabel(faq({}), [seattle, toronto], [us, ca])).toBeNull();
  });

  it("still names a Country FAQ when its Country is archived or unknown", () => {
    const archivedCa = { ...ca, archivedAt: "2026-01-01T00:00:00.000Z" };

    expect(faqBadgeLabel(faq({ countryId: CA_ID }), [seattle], [us, archivedCa])).toBe("Canada only");
    expect(faqBadgeLabel(faq({ countryId: "zzz" }), [seattle], [us])).toBe("A closed country only");
  });
});
