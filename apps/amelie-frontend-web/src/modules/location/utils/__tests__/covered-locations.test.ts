import { describe, expect, it } from "vitest";
import type { Location } from "@repo/contracts/amelie";
import { coveredLocations } from "../covered-locations";

const location = (id: string): Location => ({
  id,
  name: id,
  slug: id,
  countryId: "99999999-9999-4999-8999-999999999999",
  address: null,
  phone: null,
  timezone: "Europe/Rome",
  archivedAt: null,
});

const downtown = location("11111111-1111-4111-8111-111111111111");
const airport = location("22222222-2222-4222-8222-222222222222");

describe("coveredLocations", () => {
  it("keeps every Location for a member covering all", () => {
    expect(coveredLocations([downtown, airport], "all")).toEqual([downtown, airport]);
  });

  it("keeps only the covered Locations for a bound member", () => {
    expect(coveredLocations([downtown, airport], [airport.id])).toEqual([airport]);
  });

  it("keeps none when the member covers nothing, and copes with no data yet", () => {
    expect(coveredLocations([downtown], [])).toEqual([]);
    expect(coveredLocations(undefined, [airport.id])).toEqual([]);
  });
});
