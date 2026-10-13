import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Location } from "@repo/contracts/amelie";
import { afterEach, describe, expect, it } from "vitest";

import { MenuItemLocationsForm } from "../menu-item-locations-form";

// -----
// jsdom has no ResizeObserver, which Radix's
// checkbox reads inside a form.
// -----
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);

const location = (id: string, name: string): Location => ({
  id,
  name,
  slug: name.toLowerCase(),
  countryId: "99999999-9999-4999-8999-999999999999",
  address: null,
  phone: null,
  timezone: "Europe/Rome",
  archivedAt: null,
});

const MAIN = "11111111-1111-4111-8111-111111111111";
const AIRPORT = "22222222-2222-4222-8222-222222222222";
const ARCHIVED = "33333333-3333-4333-8333-333333333333";
const open = [location(MAIN, "Main"), location(AIRPORT, "Airport")];

describe("MenuItemLocationsForm", () => {
  it("offers only open Locations, as checkboxes", () => {
    render(
      <MenuItemLocationsForm
        item={{ id: "item", availableAtAllLocations: true, locationIds: [ARCHIVED] }}
        locations={open}
        isPending={false}
        error={null}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getAllByRole("checkbox").map((box) => box.textContent || box.closest("label")?.textContent)).toEqual([
      "Main",
      "Airport",
    ]);
    expect(screen.queryByText("A closed location")).toBeNull();
  });

  it("saves an empty list when the only row was an archived Location", async () => {
    const saved: unknown[] = [];
    render(
      <MenuItemLocationsForm
        item={{ id: "item", availableAtAllLocations: true, locationIds: [ARCHIVED] }}
        locations={open}
        isPending={false}
        error={null}
        onSubmit={(body) => saved.push(body)}
        onCancel={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(saved).toEqual([{ availableAtAllLocations: true, locationIds: [] }]));
  });

  it("ticks a Location with its label", () => {
    render(
      <MenuItemLocationsForm
        item={{ id: "item", availableAtAllLocations: true, locationIds: [] }}
        locations={open}
        isPending={false}
        error={null}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    const airport = screen.getByRole("checkbox", { name: "Airport" });
    expect(airport.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(airport);
    expect(airport.getAttribute("aria-checked")).toBe("true");
  });
});
