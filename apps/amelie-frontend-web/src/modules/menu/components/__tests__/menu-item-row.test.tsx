import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Country, Location, MenuItem } from "@repo/contracts/amelie";

import { PowerMarksProvider } from "#/modules/shared";
import type { MenuAccess } from "../../types";
import { MenuItemRow } from "../menu-item-row";

const idle = () => ({ isPending: false, isError: false, error: null, mutate: vi.fn<() => void>() });

vi.mock("../../hooks", () => ({
  useMenuActions: () => ({
    updateItem: idle(),
    removeItem: idle(),
    setLocations: idle(),
    setSoldOut: idle(),
    setSoldOutLocations: idle(),
    setCountryPrice: idle(),
    addImages: idle(),
    removeImage: idle(),
    setCover: idle(),
    reorderImages: { ...idle(), flush: () => Promise.resolve() },
  }),
}));

const places = vi.hoisted<{ open: Location[] }>(() => ({ open: [] }));

vi.mock("#/modules/location", () => ({
  useActiveLocations: () => ({ locations: places.open, isPending: false, error: null }),
}));

afterEach(() => {
  cleanup();
  places.open = [];
});

const downtown: Location = {
  id: "loc",
  countryId: "ca",
  name: "Downtown",
  slug: "downtown",
  address: null,
  phone: null,
  timezone: "America/Toronto",
  archivedAt: null,
};

const airport: Location = { ...downtown, id: "airport", name: "Airport", slug: "airport" };

const latte: MenuItem = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Latte",
  description: null,
  price: "6.25",
  currency: "CAD",
  variants: null,
  isAvailable: true,
  availableAtAllLocations: true,
  locationIds: [],
  coverPath: null,
  images: [],
  dietaryTags: [],
  isSold: true,
};

const ALL_ACCESS: MenuAccess = {
  canCreateCategory: true,
  canUpdateCategory: true,
  canDeleteCategory: true,
  canReorderCategories: true,
  canCreateItem: true,
  canUpdateItem: true,
  canDeleteItem: true,
  canReorderItems: true,
  canSetCountryPrice: true,
  canSetLocations: true,
  canSetAvailability: true,
  canCreateImage: true,
  canUpdateImage: true,
  canDeleteImage: true,
  canReorderImages: true,
};

const NO_ACCESS: MenuAccess = {
  canCreateCategory: false,
  canUpdateCategory: false,
  canDeleteCategory: false,
  canReorderCategories: false,
  canCreateItem: false,
  canUpdateItem: false,
  canDeleteItem: false,
  canReorderItems: false,
  canSetCountryPrice: false,
  canSetLocations: false,
  canSetAvailability: false,
  canCreateImage: false,
  canUpdateImage: false,
  canDeleteImage: false,
  canReorderImages: false,
};

const ca: Country = { id: "ca", country: "CA", currency: "CAD", archivedAt: null };

function renderRow(kind: "catalog" | "floor", access: MenuAccess = ALL_ACCESS) {
  render(
    <PowerMarksProvider visible>
      <ul>
        <MenuItemRow
          item={latte}
          categoryId="cat"
          categories={[{ id: "cat", name: "Coffee" }]}
          dietaryTags={[]}
          access={access}
          kind={kind}
          country={ca}
          location={{
            id: "loc",
            countryId: "ca",
            name: "Downtown",
            slug: "downtown",
            address: null,
            phone: null,
            timezone: "America/Toronto",
            archivedAt: null,
          }}
          isFirst
          isLast
          onMove={() => {}}
        />
      </ul>
    </PowerMarksProvider>,
  );
}

describe("MenuItemRow", () => {
  it("lets Master menu edit, photograph and delete, not mark sold out", () => {
    renderRow("catalog");

    expect(screen.getByRole("button", { name: "Edit item" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Photos" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete item" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sold out" })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Sold in Canada (CAD)" })).toBeTruthy();
  });

  it("lets the store Menu mark sold out, not edit, photograph or delete", () => {
    renderRow("floor");

    expect(screen.getByRole("button", { name: "Sold out" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit item" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Photos" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete item" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Sold in Canada (CAD)" })).toBeNull();
  });

  it("shows only the controls its role has a Power for, each marked with that Power", () => {
    renderRow("catalog", { ...NO_ACCESS, canReorderItems: true, canUpdateItem: true });

    expect(screen.getByRole("button", { name: "Move up" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit item" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Delete item" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Photos" })).toBeNull();
    expect(screen.getByRole("button", { name: "Needs Master menu › Menu item · Update" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Needs Master menu › Menu item · Reorder" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Needs Master menu › Menu item · Delete" })).toBeNull();
  });

  it("offers Photos to a role that can only add photos, and shows no price control", () => {
    renderRow("catalog", { ...NO_ACCESS, canCreateImage: true });

    expect(screen.getByRole("button", { name: "Photos" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit item" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Sold in Canada (CAD)" })).toBeNull();
  });

  it("puts the location picker under the Master menu Power, not the store one", () => {
    places.open = [downtown, airport];
    renderRow("catalog", { ...NO_ACCESS, canSetLocations: true });

    expect(screen.getByRole("button", { name: "Needs Master menu › Menu item location · Update" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Needs Store menu › Location availability · Update" })).toBeNull();
  });

  it("keeps sold-out at a location on the store Power", () => {
    places.open = [downtown, airport];
    renderRow("floor", { ...NO_ACCESS, canSetAvailability: true });

    expect(screen.getByRole("button", { name: "Needs Store menu › Location availability · Update" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Needs Master menu › Menu item location · Update" })).toBeNull();
  });
});
