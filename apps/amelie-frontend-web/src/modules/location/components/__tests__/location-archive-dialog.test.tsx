import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Location } from "@repo/contracts/amelie";
import { afterEach, describe, expect, it } from "vitest";

import { LocationArchiveDialog } from "../location-archive-dialog";

afterEach(cleanup);

const airport: Location = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Airport",
  slug: "airport",
  countryId: "22222222-2222-4222-8222-222222222222",
  address: null,
  phone: null,
  timezone: "America/New_York",
  archivedAt: null,
};
const priya = { partyId: "33333333-3333-4333-8333-333333333333", name: "Priya Shah", email: "priya@example.com" };

const renderDialog = (membersWithoutLocation: (typeof priya)[] | undefined, onConfirm = () => {}) =>
  render(
    <LocationArchiveDialog
      location={airport}
      isPending={false}
      membersWithoutLocation={membersWithoutLocation}
      onConfirm={onConfirm}
      onCancel={() => {}}
    />,
  );

describe("LocationArchiveDialog", () => {
  it("names the members left with no open Location, by name and email, and the count", () => {
    renderDialog([priya]);

    expect(screen.getByText(/1 team member will be left with no active Location/)).toBeTruthy();
    expect(screen.getByText("Priya Shah")).toBeTruthy();
    expect(screen.getByText(/priya@example\.com/)).toBeTruthy();
  });

  it("pluralises the count", () => {
    renderDialog([priya, { ...priya, partyId: "44444444-4444-4444-8444-444444444444", name: "Sam", email: "sam@example.com" }]);

    expect(screen.getByText(/2 team members will be left with no active Location/)).toBeTruthy();
  });

  it("says nothing about members when none are affected, and still lets the admin archive", () => {
    let confirmed = 0;
    renderDialog([], () => (confirmed += 1));

    expect(screen.queryByText(/left with no active Location/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(confirmed).toBe(1);
  });

  it("does not block the archive while the members are still loading", () => {
    renderDialog(undefined);

    expect(screen.getByRole("button", { name: "Archive" }).hasAttribute("disabled")).toBe(false);
  });
});
