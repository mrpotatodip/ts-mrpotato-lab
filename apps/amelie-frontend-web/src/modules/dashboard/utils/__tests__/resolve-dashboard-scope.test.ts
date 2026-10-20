import type { Country, Location } from "@repo/contracts/amelie";
import { describe, expect, it } from "vitest";

import { resolveDashboardScope } from "../resolve-dashboard-scope";

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

const downtown = location("downtown", US_ID);
const airport = location("airport", US_ID);
const toronto = location("toronto", CA_ID);
const archivedUs = location("old-us", US_ID, "2026-01-01T00:00:00.000Z");

const none = { countryId: null, locationId: null };

describe("resolveDashboardScope", () => {
  it("omits engine ids while the cafe has one Country and one Location", () => {
    const scope = resolveDashboardScope([us], [downtown], none);

    expect(scope.country).toEqual(us);
    expect(scope.location).toEqual(downtown);
    expect(scope.countryId).toBeUndefined();
    expect(scope.locationId).toBeUndefined();
    expect(scope.profileLocationId).toBeUndefined();
    expect(scope.emptyPlace).toBe(false);
    expect(scope.showCountryPicker).toBe(false);
    expect(scope.showLocationPicker).toBe(false);
  });

  it("opens on the oldest Country and its oldest Location when nothing is stored", () => {
    const scope = resolveDashboardScope([us, ca], [airport, downtown, toronto], none);

    expect(scope.country).toEqual(us);
    expect(scope.location).toEqual(airport);
    expect(scope.countryId).toBe(US_ID);
    expect(scope.locationId).toBe("airport");
    expect(scope.profileLocationId).toBe("airport");
    expect(scope.locations.map((entry) => entry.id)).toEqual(["airport", "downtown"]);
    expect(scope.showCountryPicker).toBe(true);
    expect(scope.showLocationPicker).toBe(true);
  });

  it("keeps a stored Country and a Location in that Country", () => {
    const scope = resolveDashboardScope([us, ca], [downtown, toronto], { countryId: CA_ID, locationId: "toronto" });

    expect(scope.country).toEqual(ca);
    expect(scope.location).toEqual(toronto);
    expect(scope.countryId).toBe(CA_ID);
    expect(scope.locationId).toBe("toronto");
    expect(scope.showLocationPicker).toBe(false);
  });

  it("ignores a stored Location that is not in the stored Country", () => {
    const scope = resolveDashboardScope([us, ca], [downtown, toronto], { countryId: CA_ID, locationId: "downtown" });

    expect(scope.country).toEqual(ca);
    expect(scope.location).toEqual(toronto);
    expect(scope.locationId).toBe("toronto");
  });

  it("falls back when the stored Country is archived or gone", () => {
    const scope = resolveDashboardScope([us, ca, mx], [downtown, toronto], { countryId: mx.id, locationId: null });

    expect(scope.country).toEqual(us);
    expect(scope.location).toEqual(downtown);
  });

  it("falls back when the stored Location is archived", () => {
    const scope = resolveDashboardScope([us, ca], [archivedUs, downtown, toronto], {
      countryId: US_ID,
      locationId: "old-us",
    });

    expect(scope.location).toEqual(downtown);
  });

  it("still names the one Location in this Country when the cafe has several", () => {
    const scope = resolveDashboardScope([us, ca], [downtown, toronto], { countryId: US_ID, locationId: null });

    expect(scope.countryId).toBe(US_ID);
    expect(scope.locationId).toBe("downtown");
    expect(scope.showLocationPicker).toBe(false);
  });

  it("omits locationId for an empty Country and does not use another Country's Location", () => {
    const scope = resolveDashboardScope([us, ca], [downtown], { countryId: CA_ID, locationId: "downtown" });

    expect(scope.country).toEqual(ca);
    expect(scope.location).toBeUndefined();
    expect(scope.locationId).toBeUndefined();
    expect(scope.profileLocationId).toBeUndefined();
    expect(scope.emptyPlace).toBe(true);
    expect(scope.locations).toEqual([]);
  });

  it("borrows another Location only to load cafe-wide profile facts", () => {
    const scope = resolveDashboardScope([us, ca], [downtown, airport], { countryId: CA_ID, locationId: null });

    expect(scope.emptyPlace).toBe(true);
    expect(scope.locationId).toBeUndefined();
    expect(scope.profileLocationId).toBe("downtown");
  });

  describe("for a member bound to some Locations", () => {
    it("lists only the covered Locations and Countries that hold one", () => {
      const scope = resolveDashboardScope([us, ca], [downtown, airport, toronto], none, [airport.id]);

      expect(scope.countries).toEqual([us]);
      expect(scope.openLocations).toEqual([airport]);
      expect(scope.location).toEqual(airport);
      expect(scope.showCountryPicker).toBe(false);
      expect(scope.showLocationPicker).toBe(false);
      expect(scope.notCovered).toBeUndefined();
    });

    it("keeps the pickers for a member covering several", () => {
      const scope = resolveDashboardScope([us, ca], [downtown, airport, toronto], none, [airport.id, toronto.id]);

      expect(scope.showCountryPicker).toBe(true);
      expect(scope.openLocations).toEqual([airport, toronto]);
    });

    it("names the open Location a stored pick points at when it is not covered", () => {
      const scope = resolveDashboardScope([us, ca], [downtown, airport], { countryId: US_ID, locationId: "downtown" }, [airport.id]);

      expect(scope.notCovered).toEqual(downtown);
      expect(scope.location).toEqual(airport);
    });

    it("has no notCovered for a stored pick that is archived or unknown", () => {
      const scope = resolveDashboardScope([us], [archivedUs, airport], { countryId: US_ID, locationId: "old-us" }, [airport.id]);

      expect(scope.notCovered).toBeUndefined();
    });

    it("lists nothing when the member covers nothing", () => {
      const scope = resolveDashboardScope([us], [downtown], none, []);

      expect(scope.openLocations).toEqual([]);
      expect(scope.countries).toEqual([]);
      expect(scope.country).toBeUndefined();
    });
  });
});
