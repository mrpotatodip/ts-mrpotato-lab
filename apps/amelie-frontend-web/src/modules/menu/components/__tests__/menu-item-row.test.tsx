import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Country, MenuItem } from "@repo/contracts/amelie";

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

vi.mock("#/modules/location", () => ({
  useActiveLocations: () => ({ locations: [], isPending: false, error: null }),
}));

afterEach(cleanup);

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

const ca: Country = { id: "ca", country: "CA", currency: "CAD", archivedAt: null };

function renderRow(kind: "catalog" | "floor") {
  render(
    <ul>
      <MenuItemRow
        item={latte}
        categoryId="cat"
        categories={[{ id: "cat", name: "Coffee" }]}
        dietaryTags={[]}
        canEdit
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
    </ul>,
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
});
