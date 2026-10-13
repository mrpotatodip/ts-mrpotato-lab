import { describe, expect, it } from "vitest";
import { nextRevealPosition } from "../next-reveal-position";

describe("nextRevealPosition", () => {
  it("moves forward a little each frame", () => {
    const next = nextRevealPosition(0, 5, 16);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(5);
  });

  it("goes faster the further behind it is", () => {
    const small = nextRevealPosition(0, 10, 16);
    const large = nextRevealPosition(0, 200, 16);
    expect(large).toBeGreaterThan(small);
  });

  it("never passes the target", () => {
    expect(nextRevealPosition(9, 10, 1000)).toBe(10);
    expect(nextRevealPosition(10, 10, 16)).toBe(10);
  });

  it("snaps back to a shorter target", () => {
    expect(nextRevealPosition(12, 10, 16)).toBe(10);
  });
});
