import { describe, expect, it } from "vitest";
import { toAllowedOriginsPayload } from "../to-allowed-origins-payload";

describe("toAllowedOriginsPayload", () => {
  it("drops blank rows and keeps typed order", () => {
    expect(toAllowedOriginsPayload([" https://sorellacafe.com/menu ", "", "http://localhost:5174"])).toEqual([
      "https://sorellacafe.com/menu",
      "http://localhost:5174",
    ]);
  });
});
