import { describe, expect, it } from "vitest";
import type { Country, Location, TeamBinding } from "@repo/contracts/amelie";
import {
  accessFromBindings,
  bindingsFromAccess,
  inviteChoiceReady,
  describeBindings,
  hasNoActiveLocations,
  toggleBinding,
} from "../team-access";

const CA_ID = "22222222-2222-4222-8222-222222222222";
const US_ID = "11111111-1111-4111-8111-111111111111";
const MX_ID = "33333333-3333-4333-8333-333333333333";

const country = (id: string, code: Country["country"], archivedAt: string | null = null): Country => ({
  id,
  country: code,
  currency: "USD",
  archivedAt,
});
const location = (id: string, name: string, countryId: string, archivedAt: string | null = null): Location => ({
  id,
  name,
  slug: id,
  countryId,
  address: null,
  phone: null,
  timezone: "America/New_York",
  archivedAt,
});

const countries = [country(CA_ID, "CA"), country(US_ID, "US"), country(MX_ID, "MX", "2026-01-01T00:00:00.000Z")];
const downtown = location("a1111111-1111-4111-8111-111111111111", "Downtown", CA_ID);
const seattle = location("b2222222-2222-4222-8222-222222222222", "Seattle", US_ID);
const tacoma = location("c3333333-3333-4333-8333-333333333333", "Tacoma", US_ID, "2026-01-01T00:00:00.000Z");
const cancun = location("d4444444-4444-4444-8444-444444444444", "Cancun", MX_ID);
const locations = [downtown, seattle, tacoma, cancun];

const inCountry = (id: string): TeamBinding => ({ kind: "country", id });
const inLocation = (id: string): TeamBinding => ({ kind: "location", id });

describe("describeBindings", () => {
  it("reads Whole cafe with no bindings", () => {
    expect(describeBindings([], countries, locations)).toBe("Whole cafe");
  });

  it("names a Country as All of <name> and a Location by its name", () => {
    expect(describeBindings([inCountry(CA_ID), inLocation(seattle.id)], countries, locations)).toBe(
      "All of Canada, Seattle",
    );
  });
});

describe("hasNoActiveLocations", () => {
  it("is false for Whole cafe", () => {
    expect(hasNoActiveLocations([], countries, locations)).toBe(false);
  });

  it("is false while any bound Location or Country Location is open", () => {
    expect(hasNoActiveLocations([inCountry(CA_ID)], countries, locations)).toBe(false);
    expect(hasNoActiveLocations([inLocation(tacoma.id), inLocation(seattle.id)], countries, locations)).toBe(false);
  });

  it("is true when only archived Locations or Countries are bound", () => {
    expect(hasNoActiveLocations([inLocation(tacoma.id)], countries, locations)).toBe(true);
    expect(hasNoActiveLocations([inCountry(MX_ID)], countries, locations)).toBe(true);
  });

  it("is true for a Country with no open Locations", () => {
    expect(hasNoActiveLocations([inCountry(US_ID)], countries, [tacoma])).toBe(true);
  });
});

describe("toggleBinding", () => {
  it("adds and removes a binding", () => {
    const added = toggleBinding([], inLocation(seattle.id), locations);
    expect(added).toEqual([inLocation(seattle.id)]);
    expect(toggleBinding(added, inLocation(seattle.id), locations)).toEqual([]);
  });

  it("drops the Location bindings a Country now covers", () => {
    const next = toggleBinding([inLocation(seattle.id), inLocation(downtown.id)], inCountry(US_ID), locations);
    expect(next).toEqual([inLocation(downtown.id), inCountry(US_ID)]);
  });
});

describe("access choice", () => {
  it("has no choice until the form is told one, and Whole cafe is an empty list", () => {
    expect(accessFromBindings([])).toEqual({ mode: "whole" });
    expect(accessFromBindings([inCountry(CA_ID)])).toEqual({ mode: "bound", bindings: [inCountry(CA_ID)] });
    expect(bindingsFromAccess({ mode: "whole" })).toEqual([]);
    expect(bindingsFromAccess({ mode: "bound", bindings: [inCountry(CA_ID)] })).toEqual([inCountry(CA_ID)]);
    expect(bindingsFromAccess(null)).toBeNull();
    expect(bindingsFromAccess({ mode: "bound", bindings: [] })).toBeNull();
  });
});

describe("inviteChoiceReady", () => {
  it("needs a Whole cafe, Country or Locations choice for a bindable Role", () => {
    expect(inviteChoiceReady(true, null)).toBe(false);
    expect(inviteChoiceReady(true, { mode: "bound", bindings: [] })).toBe(false);
    expect(inviteChoiceReady(true, { mode: "whole" })).toBe(true);
    expect(inviteChoiceReady(true, { mode: "bound", bindings: [{ kind: "country", id: CA_ID }] })).toBe(true);
  });

  it("asks for nothing when the Role cannot be bound", () => {
    expect(inviteChoiceReady(false, null)).toBe(true);
  });
});
