import { describe, expect, it } from "vitest";
import type { Location } from "@repo/contracts/amelie";
import { activeLocations } from "../active-locations";
import { isLocationChanged, toLocationBody, toLocationValues } from "../location-form";

const location: Location = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Downtown",
  slug: "downtown",
  countryId: "99999999-9999-4999-8999-999999999999",
  address: "1 Main St",
  phone: null,
  timezone: "Europe/Rome",
  archivedAt: null,
};

describe("activeLocations", () => {
  it("drops archived Locations and copes with no data yet", () => {
    const archived = { ...location, id: "22222222-2222-4222-8222-222222222222", archivedAt: "2026-01-01T00:00:00.000Z" };

    expect(activeLocations([location, archived])).toEqual([location]);
    expect(activeLocations(undefined)).toEqual([]);
  });
});

describe("the Location edit form values", () => {
  it("shows a missing address or phone as an empty box", () => {
    expect(toLocationValues(location)).toEqual({ name: "Downtown", address: "1 Main St", phone: "", timezone: "Europe/Rome" });
  });

  it("sends a blank address or phone as null and trims the rest", () => {
    expect(toLocationBody({ name: " Downtown ", address: " ", phone: "+39 06 1", timezone: " Europe/Rome " })).toEqual({
      name: "Downtown",
      address: null,
      phone: "+39 06 1",
      timezone: "Europe/Rome",
    });
  });

  it("is unchanged until a value really differs, ignoring outer spaces and a blank for null", () => {
    expect(isLocationChanged(toLocationValues(location), location)).toBe(false);
    expect(isLocationChanged({ ...toLocationValues(location), name: " Downtown " }, location)).toBe(false);
    expect(isLocationChanged({ ...toLocationValues(location), phone: "  " }, location)).toBe(false);
    expect(isLocationChanged({ ...toLocationValues(location), phone: "+39" }, location)).toBe(true);
    expect(isLocationChanged({ ...toLocationValues(location), timezone: "Asia/Tokyo" }, location)).toBe(true);
  });
});
