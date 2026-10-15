import { afterEach, describe, expect, it, vi } from "vitest";

import { createDebouncedCall } from "../debounced-call";

afterEach(() => {
  vi.useRealTimers();
});

describe("createDebouncedCall", () => {
  it("sends only the last value after the delay", () => {
    vi.useFakeTimers();
    const send = vi.fn<(value: number) => void>();
    const debounce = createDebouncedCall(400, send);

    debounce.schedule(1);
    debounce.schedule(2);
    debounce.schedule(3);
    expect(send).not.toHaveBeenCalled();
    expect(debounce.hasPending()).toBe(true);

    vi.advanceTimersByTime(399);
    expect(send).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(3);
    expect(debounce.hasPending()).toBe(false);
  });

  it("sends immediately on flush and ignores a later timer", () => {
    vi.useFakeTimers();
    const send = vi.fn<(value: string) => void>();
    const debounce = createDebouncedCall(400, send);

    debounce.schedule("draft");
    debounce.flush();
    expect(send).toHaveBeenCalledWith("draft");

    vi.advanceTimersByTime(400);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("drops a pending value on cancel", () => {
    vi.useFakeTimers();
    const send = vi.fn<(value: string) => void>();
    const debounce = createDebouncedCall(400, send);

    debounce.schedule("draft");
    debounce.cancel();
    vi.advanceTimersByTime(400);
    expect(send).not.toHaveBeenCalled();
    expect(debounce.hasPending()).toBe(false);
  });
});
