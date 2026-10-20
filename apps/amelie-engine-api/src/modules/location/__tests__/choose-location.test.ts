import { describe, expect, it } from "vitest";
import { chooseLocation } from "#/modules/location/lib";
import type { ActiveLocation } from "#/modules/location/types";

// SAFETY: chooseLocation reads only id and name.
const place = (id: string, name: string) => ({ id, name }) as ActiveLocation;
const active = [place("a", "Airport"), place("d", "Downtown"), place("h", "Harbour")];

describe("chooseLocation over covered Locations", () => {
  it("is unchanged for coverage all", () => {
    expect(chooseLocation(active, undefined, "all")).toMatchObject({ kind: "needs-location" });
    expect(chooseLocation(active, "d", "all")).toMatchObject({ kind: "chosen" });
  });

  it("uses the only covered Location when none is named", () => {
    expect(chooseLocation(active, undefined, ["h"])).toEqual({ kind: "chosen", location: active[2] });
  });

  it("offers only the covered ones when several are covered and none is named", () => {
    expect(chooseLocation(active, undefined, ["a", "h"])).toEqual({
      kind: "needs-location",
      options: [
        { id: "a", name: "Airport" },
        { id: "h", name: "Harbour" },
      ],
    });
  });

  it("does not choose an uncovered Location, and an empty list covers nothing", () => {
    expect(chooseLocation(active, "d", ["a"])).toEqual({ kind: "unknown" });
    expect(chooseLocation(active, undefined, [])).toEqual({ kind: "needs-location", options: [] });
  });
});
