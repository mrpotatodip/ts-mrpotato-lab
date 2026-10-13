import type { Location } from "@repo/contracts/amelie";
import { describe, expect, it } from "vitest";

import { chooseLocation } from "../choose-location";

// SAFETY: chooseLocation only reads id; the rest of a Location is never touched.
const location = (id: string) => ({ id }) as Location;

describe("chooseLocation", () => {
  it("picks nothing with one open Location, as the engine uses it", () => {
    expect(chooseLocation([location("a")], null)).toBeUndefined();
    expect(chooseLocation([], null)).toBeUndefined();
  });

  it("keeps the pick when several are open", () => {
    expect(chooseLocation([location("a"), location("b")], "b")?.id).toBe("b");
  });

  it("falls back to the oldest when the pick is gone or none was made", () => {
    expect(chooseLocation([location("a"), location("b")], "archived")?.id).toBe("a");
    expect(chooseLocation([location("a"), location("b")], null)?.id).toBe("a");
  });
});
