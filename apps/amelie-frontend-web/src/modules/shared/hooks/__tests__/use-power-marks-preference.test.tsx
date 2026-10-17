import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { usePowerMarksPreference } from "../use-power-marks-preference";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  const { result } = renderHook(() => usePowerMarksPreference());
  act(() => result.current.setOn(false));
  cleanup();
});

describe("usePowerMarksPreference", () => {
  it("is off until someone turns it on", () => {
    const { result } = renderHook(() => usePowerMarksPreference());

    expect(result.current.on).toBe(false);
  });

  it("turns on and off, and remembers the choice in the browser", () => {
    const { result } = renderHook(() => usePowerMarksPreference());

    act(() => result.current.setOn(true));
    expect(result.current.on).toBe(true);
    expect(window.localStorage.getItem("power-marks")).toBe("on");

    act(() => result.current.setOn(false));
    expect(result.current.on).toBe(false);
    expect(window.localStorage.getItem("power-marks")).toBe("off");
  });

  it("starts on when the browser already remembers on", () => {
    window.localStorage.setItem("power-marks", "on");

    const { result } = renderHook(() => usePowerMarksPreference());

    expect(result.current.on).toBe(true);
  });

  it("keeps every user of the hook in step", () => {
    const first = renderHook(() => usePowerMarksPreference());
    const second = renderHook(() => usePowerMarksPreference());

    act(() => first.result.current.setOn(true));

    expect(second.result.current.on).toBe(true);
  });
});
