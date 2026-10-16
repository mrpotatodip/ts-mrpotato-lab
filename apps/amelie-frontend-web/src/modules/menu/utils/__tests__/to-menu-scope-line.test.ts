import { describe, expect, it } from "vitest";
import type { Country, Location } from "@repo/contracts/amelie";

import { MENU_INTRO, STORE_MENU_INTRO, toMenuDescription, toMenuScopeLine } from "../to-menu-scope-line";

const ca: Country = { id: "ca", country: "CA", currency: "CAD", archivedAt: null };
const downtown: Pick<Location, "name"> = { name: "Downtown" };

describe("toMenuScopeLine", () => {
  it("names the Location and Country together", () => {
    expect(toMenuScopeLine({ country: ca, location: downtown, emptyPlace: false })).toBe("Downtown in Canada (CAD)");
  });

  it("names a Country that has no Location yet", () => {
    expect(toMenuScopeLine({ country: ca, location: undefined, emptyPlace: true })).toBe("Canada (CAD), no location yet");
  });

  it("names the Country when there is no Location to show", () => {
    expect(toMenuScopeLine({ country: ca, location: undefined, emptyPlace: false })).toBe("Canada (CAD)");
  });

  it("is empty when the cafe has no Country", () => {
    expect(toMenuScopeLine({ country: undefined, location: downtown, emptyPlace: false })).toBeNull();
  });
});

describe("toMenuDescription", () => {
  it("leads with the place, then what the page is for", () => {
    expect(toMenuDescription({ country: ca, location: downtown, emptyPlace: false })).toBe(
      `Downtown in Canada (CAD). ${MENU_INTRO}`,
    );
  });

  it("stays the intro when there is no Country", () => {
    expect(toMenuDescription({ country: undefined, location: undefined, emptyPlace: false })).toBe(MENU_INTRO);
  });

  it("uses the store intro when this Location only marks sold out", () => {
    expect(toMenuDescription({ country: ca, location: downtown, emptyPlace: false }, STORE_MENU_INTRO)).toBe(
      `Downtown in Canada (CAD). ${STORE_MENU_INTRO}`,
    );
  });
});
