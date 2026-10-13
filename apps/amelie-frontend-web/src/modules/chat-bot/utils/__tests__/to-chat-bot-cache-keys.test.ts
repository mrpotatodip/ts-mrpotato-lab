import { describe, expect, it } from "vitest";
import { businessProfileKeys } from "#/modules/business-profile";
import { faqsKeys } from "#/modules/faq";
import { menuKeys } from "#/modules/menu";
import { tenantHoursKeys } from "#/modules/schedule";
import { unansweredQuestionsKeys } from "#/modules/unanswered-question";

import { toChatBotCacheKeys } from "../to-chat-bot-cache-keys";

describe("toChatBotCacheKeys", () => {
  it("reloads the menu after an availability or price write", () => {
    expect(toChatBotCacheKeys("setMenuItemAvailability", { id: "i1", isAvailable: false })).toEqual([menuKeys.all]);
    expect(toChatBotCacheKeys("setMenuItemsAvailability", { items: [], notFound: [] })).toEqual([menuKeys.all]);
    expect(toChatBotCacheKeys("updateMenuItemPrice", { id: "i1", price: "5.00" })).toEqual([menuKeys.all]);
    expect(toChatBotCacheKeys("addMenuCategory", { id: "c1", name: "Tea", note: null })).toEqual([menuKeys.all]);
  });

  it("reloads FAQs, hours, profile and unanswered after those writes", () => {
    expect(toChatBotCacheKeys("addFaq", { id: "f1", question: "Q", answer: "A" })).toEqual([faqsKeys.all]);
    expect(toChatBotCacheKeys("updateFaq", { id: "f1", question: "Q", answer: "A" })).toEqual([faqsKeys.all]);
    expect(toChatBotCacheKeys("setBusinessHours", { weekday: "Monday", isClosed: false })).toEqual([
      tenantHoursKeys.all,
    ]);
    expect(toChatBotCacheKeys("setHoursOverride", { date: "2026-12-25", isClosed: true })).toEqual([
      tenantHoursKeys.all,
    ]);
    expect(toChatBotCacheKeys("removeHoursOverride", { date: "2026-12-25" })).toEqual([tenantHoursKeys.all]);
    expect(toChatBotCacheKeys("updateBusinessProfile", { phone: "555" })).toEqual([businessProfileKeys.all]);
    expect(toChatBotCacheKeys("reportMissingInformation", { topic: "parking" })).toEqual([
      unansweredQuestionsKeys.all,
    ]);
  });

  it("does nothing for a read, a failed call, or a choice that wrote nothing", () => {
    expect(toChatBotCacheKeys("listMenu", { categories: [] })).toEqual([]);
    expect(toChatBotCacheKeys("setMenuItemAvailability", { error: "not found" })).toEqual([]);
    expect(
      toChatBotCacheKeys("setBusinessHours", { needsLocation: true, message: "Which location?", locations: [] }),
    ).toEqual([]);
    expect(
      toChatBotCacheKeys("updateMenuItemPrice", { needsCountry: true, message: "Which country?", countries: [] }),
    ).toEqual([]);
    expect(
      toChatBotCacheKeys("addFaq", { needsScope: true, message: "Where?", countries: [], locations: [] }),
    ).toEqual([]);
  });
});
