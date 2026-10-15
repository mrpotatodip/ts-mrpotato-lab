import { describe, expect, it } from "vitest";

import { toChatBotCountryLabel, toChatBotMapsHref } from "../to-chat-bot-place";

describe("toChatBotMapsHref", () => {
  it("searches Google Maps for the address", () => {
    expect(toChatBotMapsHref("1 Main St")).toBe("https://www.google.com/maps/search/?api=1&query=1%20Main%20St");
  });
});

describe("toChatBotCountryLabel", () => {
  it("names the country the way setThreadCountry does", () => {
    expect(toChatBotCountryLabel({ name: "United States", code: "US" })).toBe("United States (US)");
  });
});
