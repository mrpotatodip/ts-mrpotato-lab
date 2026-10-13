import type { QueryKey } from "@tanstack/react-query";
import { isChatBotToolError } from "@repo/chat-bot/tools";
import type { ChatBotJson } from "@repo/contracts/chat-bots";
import { businessProfileKeys } from "#/modules/business-profile";
import { faqsKeys } from "#/modules/faq";
import { menuKeys } from "#/modules/menu";
import { tenantHoursKeys } from "#/modules/schedule";
import { unansweredQuestionsKeys } from "#/modules/unanswered-question";

const CHAT_BOT_WRITE_CACHE_KEYS: Readonly<Record<string, readonly QueryKey[]>> = {
  setMenuItemAvailability: [menuKeys.all],
  setMenuItemsAvailability: [menuKeys.all],
  updateMenuItemPrice: [menuKeys.all],
  addMenuCategory: [menuKeys.all],
  addFaq: [faqsKeys.all],
  updateFaq: [faqsKeys.all],
  setBusinessHours: [tenantHoursKeys.all],
  setHoursOverride: [tenantHoursKeys.all],
  removeHoursOverride: [tenantHoursKeys.all],
  updateBusinessProfile: [businessProfileKeys.all],
  reportMissingInformation: [unansweredQuestionsKeys.all],
};

const wroteNothing = (result: ChatBotJson): boolean => {
  if (isChatBotToolError(result)) return true;
  if (result === null || typeof result !== "object" || Array.isArray(result)) return false;
  return "needsLocation" in result || "needsCountry" in result || "needsScope" in result;
};

export function toChatBotCacheKeys(tool: string, result: ChatBotJson): readonly QueryKey[] {
  if (wroteNothing(result)) return [];
  return CHAT_BOT_WRITE_CACHE_KEYS[tool] ?? [];
}
