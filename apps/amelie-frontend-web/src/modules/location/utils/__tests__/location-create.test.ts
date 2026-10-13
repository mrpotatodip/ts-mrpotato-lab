import { describe, expect, it } from "vitest";
import { CreateLocationBodySchema, type Country } from "@repo/contracts/amelie";
import { needsCountryChoice, toLocationCreateBody } from "../location-create";

const US: Country = { id: "11111111-1111-4111-8111-111111111111", country: "US", currency: "USD", archivedAt: null };
const CA: Country = { id: "22222222-2222-4222-8222-222222222222", country: "CA", currency: "CAD", archivedAt: null };

describe("needsCountryChoice", () => {
  it("asks which Country only when the cafe has two or more", () => {
    expect(needsCountryChoice([US])).toBe(false);
    expect(needsCountryChoice([US, CA])).toBe(true);
  });
});

describe("toLocationCreateBody", () => {
  it("sends just the name for a one-Country cafe, whatever Country was held", () => {
    expect(toLocationCreateBody(" Airport ", CA.id, [US])).toEqual({ name: "Airport" });
  });

  it("sends the chosen Country when there are several", () => {
    const body = toLocationCreateBody("Toronto", CA.id, [US, CA]);

    expect(body).toEqual({ name: "Toronto", countryId: CA.id });
    expect(CreateLocationBodySchema.safeParse(body).success).toBe(true);
  });

  it("sends no Country when none was chosen, so the engine can refuse with its reason", () => {
    expect(toLocationCreateBody("Toronto", null, [US, CA])).toEqual({ name: "Toronto" });
  });
});
