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
const toronto: Location = { ...downtown, id: "toronto", name: "Toronto", slug: "toronto", countryId: "ca" };

const idle: DashboardScopeControlsProps = {
  countries: [us],
  locations: [downtown],
  country: us,
  location: downtown,
  emptyPlace: false,
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

  it("names the picked place and Country in one control when there are several", () => {
    render(
      <DashboardScopeControls
        {...idle}
        countries={[us, ca]}
        locations={[downtown, airport, toronto]}
        showCountryPicker
        showLocationPicker
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Country and location" });
    expect(trigger.textContent).toContain("Downtown");
    expect(trigger.textContent).toContain("United States");
    expect(screen.queryByRole("combobox", { name: "Country" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Location" })).toBeNull();
  });

  it("names only the Location while the cafe sells in one Country", () => {
    render(<DashboardScopeControls {...idle} locations={[downtown, airport]} showLocationPicker />);

    expect(screen.getByRole("combobox", { name: "Location" }).textContent).toContain("Downtown");
    expect(screen.getByRole("combobox", { name: "Location" }).textContent).not.toContain("United States");
  });

  it("names a Country with no Location", () => {
    render(
      <DashboardScopeControls
        {...idle}
        countries={[us, ca]}
        locations={[downtown]}
        country={ca}
        location={undefined}
        emptyPlace
        showCountryPicker
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Country and location" });
    expect(trigger.textContent).toContain("Canada");
    expect(trigger.textContent).toContain("No location yet");
  });
});
