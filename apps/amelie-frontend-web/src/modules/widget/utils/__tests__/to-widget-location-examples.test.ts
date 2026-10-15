import { describe, expect, it } from "vitest";
import type { Country, Location } from "@repo/contracts/amelie";
import { toWidgetLocationExamples } from "../to-widget-location-examples";

const US_ID = "11111111-1111-4111-8111-111111111111";
const CA_ID = "22222222-2222-4222-8222-222222222222";

const us: Country = { id: US_ID, country: "US", currency: "USD", archivedAt: null };
const ca: Country = { id: CA_ID, country: "CA", currency: "CAD", archivedAt: null };

const location = (id: string, name: string, slug: string, countryId: string): Location => ({
  id,
  name,
  slug,
  countryId,
  address: null,
  phone: null,
  timezone: "America/New_York",
  archivedAt: null,
});

describe("toWidgetLocationExamples", () => {
  it("pairs each Location with its country code", () => {
    expect(
      toWidgetLocationExamples(
        [
          location("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "Downtown", "downtown", US_ID),
          location("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "Toronto", "toronto", CA_ID),
        ],
        [us, ca],
      ),
    ).toEqual([
      { name: "Downtown", slug: "downtown", country: "US" },
      { name: "Toronto", slug: "toronto", country: "CA" },
    ]);
  });

  it("skips a Location whose Country is missing", () => {
    expect(
      toWidgetLocationExamples(
        [location("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "Downtown", "downtown", US_ID)],
        [ca],
      ),
    ).toEqual([]);
  });
});
