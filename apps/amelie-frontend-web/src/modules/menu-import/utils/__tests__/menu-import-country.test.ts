import { describe, expect, it } from "vitest";
import { importPriceText, publishModesFor, usableMode } from "../menu-import-country";

describe("publishModesFor", () => {
  it("offers Replace and Add for a one-Country cafe, as before", () => {
    expect(publishModesFor(false)).toEqual(["replace", "add"]);
  });

  it("offers only Add when the cafe has several Countries", () => {
    expect(publishModesFor(true)).toEqual(["add"]);
  });
});

describe("usableMode", () => {
  it("keeps the chosen mode when it is offered", () => {
    expect(usableMode("replace", false)).toBe("replace");
  });

  it("falls back to Add when Replace is not offered", () => {
    expect(usableMode("replace", true)).toBe("add");
  });
});

describe("importPriceText", () => {
  it("shows the price alone for a one-Country cafe", () => {
    expect(importPriceText("4.75", undefined)).toBe("4.75");
  });

  it("puts the Country's currency before the price", () => {
    expect(importPriceText("4.75", "CAD")).toBe("CAD 4.75");
  });
});
