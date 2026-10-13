import { describe, expect, it } from "vitest";

import { toChatBotDateLabel, toChatBotHoursText } from "../to-chat-bot-hours";

describe("toChatBotHoursText", () => {
  it("shows the open and close times", () => {
    expect(toChatBotHoursText({ isClosed: false, opensAt: "08:00", closesAt: "17:00" })).toBe("08:00 to 17:00");
  });

  it("says Closed for a closed day", () => {
    expect(toChatBotHoursText({ isClosed: true, opensAt: null, closesAt: null })).toBe("Closed");
  });

  it("says Not set when the day has no hours yet", () => {
    expect(toChatBotHoursText({ isSet: false, isClosed: false, opensAt: null, closesAt: null })).toBe("Not set");
  });
});

describe("toChatBotDateLabel", () => {
  it("writes the date for a person, the same in every time zone", () => {
    expect(toChatBotDateLabel("2026-12-25")).toBe("Fri, Dec 25");
  });

  it("keeps text that is not a date", () => {
    expect(toChatBotDateLabel("tomorrow")).toBe("tomorrow");
  });
});
