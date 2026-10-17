import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { usePowerMarksPreference } from "#/modules/shared";
import { DashboardPowerMarksToggle } from "../dashboard-power-marks-toggle";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  const { result } = renderHook(() => usePowerMarksPreference());
  act(() => result.current.setOn(false));
  cleanup();
});

describe("DashboardPowerMarksToggle", () => {
  it("offers to show the marks while they are off", () => {
    render(<DashboardPowerMarksToggle />);

    const button = screen.getByRole("button", { name: "Show power marks" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("switches the marks on and back off, saying which it will do next", () => {
    render(<DashboardPowerMarksToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Show power marks" }));
    const on = screen.getByRole("button", { name: "Hide power marks" });
    expect(on.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(on);
    expect(screen.getByRole("button", { name: "Show power marks" }).getAttribute("aria-pressed")).toBe("false");
  });
});
