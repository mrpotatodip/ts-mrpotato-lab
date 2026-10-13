import { describe, it, expect } from "vitest";
import { resolveChatBotToolDisplay } from "../display";

describe("resolveChatBotToolDisplay", () => {
  it("keeps null so a custom or generic card is used", () => {
    expect(resolveChatBotToolDisplay(null, null)).toEqual({
      display: null,
      displayOptions: null,
      valid: true,
    });
  });

  it("accepts valid options for a layout", () => {
    expect(
      resolveChatBotToolDisplay("number", { value: "price", unit: "currency" }),
    ).toEqual({
      display: "number",
      displayOptions: { value: "price", unit: "currency" },
      valid: true,
    });
  });

  it("falls back to key_value for bad options", () => {
    expect(resolveChatBotToolDisplay("number", { unit: "currency" })).toEqual({
      display: "key_value",
      displayOptions: {},
      valid: false,
    });
  });

  it("falls back to key_value for an unknown layout", () => {
    expect(resolveChatBotToolDisplay("chart", {})).toMatchObject({
      display: "key_value",
      valid: false,
    });
  });
});
