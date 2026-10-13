import { describe, expect, it } from "vitest";
import type { Location } from "@repo/contracts/amelie";
import { toArchivedNotice } from "../archived-notice";

const airport: Location = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Airport",
  slug: "airport",
  countryId: "99999999-9999-4999-8999-999999999999",
  address: null,
  phone: null,
  timezone: "Europe/Rome",
  archivedAt: null,
};

const latte = { id: "22222222-2222-4222-8222-222222222222", name: "Latte" };

describe("toArchivedNotice", () => {
  it("names the archived Location and carries the items now sold nowhere", () => {
    expect(toArchivedNotice([airport], { id: airport.id, unsoldMenuItems: [latte] })).toEqual({
      name: "Airport",
      unsoldMenuItems: [latte],
    });
  });

  it("falls back to a plain name when the Location is not in the list", () => {
    expect(toArchivedNotice(undefined, { id: airport.id, unsoldMenuItems: [] })).toEqual({
      name: "The location",
      unsoldMenuItems: [],
    });
  });
});
