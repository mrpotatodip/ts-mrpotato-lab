import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Location } from "@repo/contracts/amelie";

import { DashboardLocationNotCovered } from "../dashboard-location-not-covered";

afterEach(cleanup);

const place = (id: string, name: string): Location => ({
  id,
  name,
  slug: id,
  countryId: "us",
  address: null,
  phone: null,
  timezone: "America/New_York",
  archivedAt: null,
});

describe("DashboardLocationNotCovered", () => {
  it("says the Role does not cover the Location, not an empty page", () => {
    render(<DashboardLocationNotCovered location={place("downtown", "Downtown")} fallback={undefined} onUseFallback={() => {}} />);

    expect(screen.getByText("Your Role does not cover this Location")).toBeTruthy();
    expect(screen.getByText(/Downtown/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers a way back to a covered Location", () => {
    const onUseFallback = vi.fn<(locationId: string) => void>();
    render(<DashboardLocationNotCovered location={place("downtown", "Downtown")} fallback={place("airport", "Airport")} onUseFallback={onUseFallback} />);

    fireEvent.click(screen.getByRole("button", { name: "Go to Airport" }));

    expect(onUseFallback).toHaveBeenCalledWith("airport");
  });
});
