import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MenuItem } from "@repo/contracts/amelie";

import { MenuItemCountrySold } from "../menu-item-country-sold";

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

describe("MenuItemCountrySold", () => {
  it("shows a checked toggle named for the Country an item sells in", () => {
    render(
      <MenuItemCountrySold
        item={latte}
        countryLabel="Canada (CAD)"
        currency="CAD"
        isPending={false}
        error={null}
        onSetSold={() => {}}
        onSetPrice={() => {}}
      />,
    );

    const toggle = screen.getByRole("checkbox", { name: "Sold in Canada (CAD)" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("turning it off sends only the flag", () => {
    const onSetSold = vi.fn<(isSold: boolean) => void>();
    render(
      <MenuItemCountrySold
        item={latte}
        countryLabel="Canada (CAD)"
        currency="CAD"
        isPending={false}
        error={null}
        onSetSold={onSetSold}
        onSetPrice={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Sold in Canada (CAD)" }));

    expect(onSetSold).toHaveBeenCalledWith(false);
  });

  it("an item not sold there but still priced can be turned back on", () => {
    const onSetSold = vi.fn<(isSold: boolean) => void>();
    render(
      <MenuItemCountrySold
        item={{ ...latte, isSold: false }}
        countryLabel="Canada (CAD)"
        currency="CAD"
        isPending={false}
        error={null}
        onSetSold={onSetSold}
        onSetPrice={() => {}}
      />,
    );

    const toggle = screen.getByRole("checkbox", { name: "Sold in Canada (CAD)" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(onSetSold).toHaveBeenCalledWith(true);
  });

  it("an item with no price there asks for one, in the Country's currency, instead of a toggle", async () => {
    const onSetPrice = vi.fn<(price: string) => void>();
    render(
      <MenuItemCountrySold
        item={{ ...latte, price: null, isSold: false }}
        countryLabel="Canada (CAD)"
        currency="CAD"
        isPending={false}
        error={null}
        onSetSold={() => {}}
        onSetPrice={onSetPrice}
      />,
    );

    expect(screen.queryByRole("checkbox")).toBeNull();
    const sell = screen.getByRole("button", { name: "Sell here" });
    expect(sell.hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByRole("textbox", { name: "Price in CAD" }), { target: { value: "6.25" } });
    expect(sell.hasAttribute("disabled")).toBe(false);
    fireEvent.click(sell);

    await waitFor(() => expect(onSetPrice).toHaveBeenCalledWith("6.25"));
  });

  it("keeps the button off for a price that is not a number", () => {
    render(
      <MenuItemCountrySold
        item={{ ...latte, price: null, isSold: false }}
        countryLabel="Canada (CAD)"
        currency="CAD"
        isPending={false}
        error={null}
        onSetSold={() => {}}
        onSetPrice={() => {}}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Price in CAD" }), { target: { value: "six" } });

    expect(screen.getByRole("button", { name: "Sell here" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows the error from a failed save", () => {
    render(
      <MenuItemCountrySold
        item={latte}
        countryLabel="Canada (CAD)"
        currency="CAD"
        isPending={false}
        error="Could not save"
        onSetSold={() => {}}
        onSetPrice={() => {}}
      />,
    );

    expect(screen.getByText("Could not save")).toBeTruthy();
  });
});
