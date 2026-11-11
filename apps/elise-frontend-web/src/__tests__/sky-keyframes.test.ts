import { describe, expect, it } from "vitest";
import { skyKeyframes, skyStartTime } from "#/modules/shell/utils/sky-keyframes";

describe("skyKeyframes", () => {
  it.each([1, 2, 3, 5])("builds an ordered loop that closes on the first sky for %i skies", (count) => {
    const urls = Array.from({ length: count }, (_, i) => `/s${i}.jpeg`);
    const frames = skyKeyframes(urls, 16_000, 4_000);
    const offsets = frames.map((frame) => frame.offset);

    expect(offsets[0]).toBe(0);
    expect(offsets.at(-1)).toBe(1);
    expect(offsets).toEqual(offsets.toSorted((a, b) => a - b));
    expect(frames.at(-1)?.backgroundImage).toBe(frames[0]?.backgroundImage);
  });

  it("holds each sky for the hold time, then fades for the fade time", () => {
    const frames = skyKeyframes(["/a.jpeg", "/b.jpeg"], 16_000, 4_000);

    expect(frames.map((frame) => frame.offset)).toEqual([0, 0.4, 0.5, 0.9, 1]);
  });

  it("gives no keyframes for no skies", () => {
    expect(skyKeyframes([], 16_000, 4_000)).toEqual([]);
  });
});

describe("skyStartTime", () => {
  it("is where a sky's hold begins in the loop", () => {
    expect(skyStartTime(2, 16_000, 4_000)).toBe(40_000);
  });
});
