import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { z } from "zod";
import { ChatBotJsonSchema, type ChatBotJson } from "@repo/contracts/chat-bots";

import { isChatBotToolCardName, renderChatBotToolCard } from "../chat-bot-tool-registry";

const TOOLS = [
  "listMenu",
  "findMenuItems",
  "showMenuItems",
  "getOpeningSchedule",
  "listFaqs",
  "getBusinessProfile",
  "listTenants",
  "reportMissingInformation",
  "setThreadCountry",
  "setThreadLocation",
  "addFaq",
  "addMenuCategory",
  "updateFaq",
  "setMenuItemAvailability",
  "setMenuItemsAvailability",
  "updateMenuItemPrice",
  "updateBusinessProfile",
  "setBusinessHours",
  "setHoursOverride",
  "removeHoursOverride",
];

const CardPropsSchema = z.object({ result: z.record(z.string(), ChatBotJsonSchema) });

const resultOf = (card: ReactElement | null) => CardPropsSchema.parse(card?.props).result;

const LOCATION_NEEDED: ChatBotJson = {
  needsLocation: true,
  message: "Which location?",
  locations: [{ id: "l1", name: "Downtown" }],
};

describe("chat bot tool cards", () => {
  it("has a card for every agent tool", () => {
    expect(TOOLS.filter((tool) => !isChatBotToolCardName(tool))).toEqual([]);
  });

  it("has no card for an unknown tool or an inherited key", () => {
    expect(isChatBotToolCardName("constructor")).toBe(false);
    expect(renderChatBotToolCard("nope", "Nope", {})).toBeNull();
  });

  it("renders nothing for a result that does not match the tool's shape", () => {
    expect(renderChatBotToolCard("listMenu", "List Menu", { unexpected: true })).toBeNull();
  });

  it("keeps the choice when a tool asks for a location", () => {
    const card = renderChatBotToolCard("getOpeningSchedule", "Get Opening Schedule", LOCATION_NEEDED);
    expect(resultOf(card)).toMatchObject({ needsLocation: true, message: "Which location?" });
  });

  it("keeps the choice when the profile read also carries the facts", () => {
    const card = renderChatBotToolCard("getBusinessProfile", "Get Business Profile", {
      ...LOCATION_NEEDED,
      description: "Cosy cafe",
      websiteUrl: null,
      phone: null,
      email: null,
      address: null,
      note: null,
    });
    expect(resultOf(card)).toMatchObject({ needsLocation: true, description: "Cosy cafe" });
  });
});
