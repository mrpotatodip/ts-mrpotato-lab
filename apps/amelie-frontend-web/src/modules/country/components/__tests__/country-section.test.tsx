import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Country, Location } from "@repo/contracts/amelie";

import { CountrySection } from "../country-section";

const us: Country = { id: "11111111-1111-4111-8111-111111111111", country: "US", currency: "USD", archivedAt: null };
const ca: Country = { id: "22222222-2222-4222-8222-222222222222", country: "CA", currency: "CAD", archivedAt: null };

const place = (id: string, countryId: string): Location => ({
  id,
  name: id,
  slug: id,
  countryId,
  address: null,
  phone: null,
  timezone: "America/New_York",
  archivedAt: null,
});
const toronto = place("33333333-3333-4333-8333-333333333333", ca.id);
const ottawa = place("44444444-4444-4444-8444-444444444444", ca.id);

vi.mock("#/modules/location", () => ({
  useLocations: () => ({ data: [toronto] }),
  useAllLocations: () => ({ data: [toronto, ottawa] }),
}));
vi.mock("#/modules/tenant", () => ({ useActiveTenantRole: () => ({ can: () => true }) }));
vi.mock("../../hooks", () => ({
  useActiveCountries: () => ({ countries: [us, ca] }),
  useCountries: () => ({ data: [us, ca] }),
  useCountryActions: () => ({
    archiveCountry: { reset: () => {}, isPending: false, isError: false },
    updateCountry: { reset: () => {}, isPending: false, isError: false },
  }),
}));

afterEach(cleanup);

describe("CountrySection for a member bound to one Location", () => {
  it("counts every open Location of a Country, not only the covered ones, so Archive is not offered as safe", () => {
    render(<CountrySection />);

    expect(screen.getByText("2 open locations")).toBeTruthy();
  });
});
