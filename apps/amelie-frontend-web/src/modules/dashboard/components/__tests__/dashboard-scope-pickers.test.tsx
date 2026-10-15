import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Country, Location } from "@repo/contracts/amelie";

import { DashboardScopeControls, type DashboardScopeControlsProps } from "../dashboard-scope-pickers";

afterEach(cleanup);

const us: Country = { id: "us", country: "US", currency: "USD", archivedAt: null };
const ca: Country = { id: "ca", country: "CA", currency: "CAD", archivedAt: null };
const downtown: Location = {
  id: "downtown",
  name: "Downtown",
  slug: "downtown",
  countryId: "us",
  address: null,
  phone: null,
  timezone: "America/New_York",
  archivedAt: null,
};
const airport: Location = { ...downtown, id: "airport", name: "Airport", slug: "airport" };

const idle: DashboardScopeControlsProps = {
  countries: [us],
  locations: [downtown],
  country: us,
  location: downtown,
  showCountryPicker: false,
  showLocationPicker: false,
  onSelectCountry: () => {},
  onSelectLocation: () => {},
};

describe("DashboardScopeControls", () => {
  it("shows nothing while the cafe has one Country and one Location", () => {
    const { container } = render(<DashboardScopeControls {...idle} />);

    expect(container.textContent).toBe("");
  });

  it("names the picked Country and Location when there are several", () => {
    render(
      <DashboardScopeControls
        {...idle}
        countries={[us, ca]}
        locations={[downtown, airport]}
        showCountryPicker
        showLocationPicker
      />,
    );

    expect(screen.getByRole("combobox", { name: "Country" }).textContent).toContain("United States");
    expect(screen.getByRole("combobox", { name: "Location" }).textContent).toContain("Downtown");
  });
});
