import type { ComponentType, ReactElement } from "react";
import type { z } from "zod";
import {
  BusinessProfileResultSchema,
  FindMenuItemsResultSchema,
  ListFaqsResultSchema,
  ListMenuResultSchema,
  ListTenantsResultSchema,
  MenuCategoryResultSchema,
  MenuItemPricingResultSchema,
  ReportMissingInformationResultSchema,
  SetThreadCountryResultSchema,
  SetMenuItemsAvailabilityResultSchema,
  SetThreadLocationResultSchema,
  ShowMenuItemsResultSchema,
  type ChatBotJson,
} from "@repo/contracts/chat-bots";
import {
  ChatBotBusinessProfileResultSchema,
  ChatBotFaqChangeResultSchema,
  ChatBotOpeningScheduleResultSchema,
  ChatBotPriceChangeResultSchema,
  ChatBotRemoveSpecialHoursResultSchema,
  ChatBotSpecialHoursChangeResultSchema,
  ChatBotWeeklyHoursChangeResultSchema,
} from "../../schemas";
import { ChatBotAddFaqCard } from "./chat-bot-add-faq-card";
import { ChatBotAddMenuCategoryCard } from "./chat-bot-add-menu-category-card";
import { ChatBotAvailabilityCard } from "./chat-bot-availability-card";
import { ChatBotAvailabilityListCard } from "./chat-bot-availability-list-card";
import { ChatBotBusinessProfileCard } from "./chat-bot-business-profile-card";
import { ChatBotFindMenuItemsCard } from "./chat-bot-find-menu-items-card";
import { ChatBotListFaqsCard } from "./chat-bot-list-faqs-card";
import { ChatBotListMenuCard } from "./chat-bot-list-menu-card";
import { ChatBotListTenantsCard } from "./chat-bot-list-tenants-card";
import { ChatBotOpeningScheduleCard } from "./chat-bot-opening-schedule-card";
import { ChatBotPriceChangeCard } from "./chat-bot-price-change-card";
import { ChatBotProfileChangeCard } from "./chat-bot-profile-change-card";
import { ChatBotReportMissingCard } from "./chat-bot-report-missing-card";
import { ChatBotSetThreadCountryCard } from "./chat-bot-set-thread-country-card";
import { ChatBotSetThreadLocationCard } from "./chat-bot-set-thread-location-card";
import { ChatBotShowMenuItemsCard } from "./chat-bot-show-menu-items-card";
import { ChatBotSpecialHoursChangeCard } from "./chat-bot-special-hours-change-card";
import { ChatBotSpecialHoursRemovedCard } from "./chat-bot-special-hours-removed-card";
import { ChatBotUpdateFaqCard } from "./chat-bot-update-faq-card";
import { ChatBotWeeklyHoursChangeCard } from "./chat-bot-weekly-hours-change-card";

export type ChatBotToolCardProps<TResult> = {
  title: string;
  result: TResult;
};

type ChatBotToolCardEntry = {
  render: (title: string, result: ChatBotJson) => ReactElement | null;
};

// -----
// The card only gets parsed data; a result
// that doesn't match renders nothing.
// -----
export function toolCard<TResult>(
  schema: z.ZodType<TResult>,
  Card: ComponentType<ChatBotToolCardProps<TResult>>,
): ChatBotToolCardEntry {
  return {
    render: (title, result) => {
      const parsed = schema.safeParse(result);
      return parsed.success ? <Card title={title} result={parsed.data} /> : null;
    },
  };
}

// -----
// Hand-built cards, by tool name. Add a tool
// here next to its card file. A tool without
// one falls back to a layout.
// -----
const CHAT_BOT_TOOL_CARDS = {
  listMenu: toolCard(ListMenuResultSchema, ChatBotListMenuCard),
  findMenuItems: toolCard(FindMenuItemsResultSchema, ChatBotFindMenuItemsCard),
  showMenuItems: toolCard(ShowMenuItemsResultSchema, ChatBotShowMenuItemsCard),
  getOpeningSchedule: toolCard(ChatBotOpeningScheduleResultSchema, ChatBotOpeningScheduleCard),
  listFaqs: toolCard(ListFaqsResultSchema, ChatBotListFaqsCard),
  getBusinessProfile: toolCard(ChatBotBusinessProfileResultSchema, ChatBotBusinessProfileCard),
  listTenants: toolCard(ListTenantsResultSchema, ChatBotListTenantsCard),
  reportMissingInformation: toolCard(ReportMissingInformationResultSchema, ChatBotReportMissingCard),
  setThreadCountry: toolCard(SetThreadCountryResultSchema, ChatBotSetThreadCountryCard),
  setThreadLocation: toolCard(SetThreadLocationResultSchema, ChatBotSetThreadLocationCard),
  addFaq: toolCard(ChatBotFaqChangeResultSchema, ChatBotAddFaqCard),
  addMenuCategory: toolCard(MenuCategoryResultSchema, ChatBotAddMenuCategoryCard),
  updateFaq: toolCard(ChatBotFaqChangeResultSchema, ChatBotUpdateFaqCard),
  setMenuItemAvailability: toolCard(MenuItemPricingResultSchema, ChatBotAvailabilityCard),
  setMenuItemsAvailability: toolCard(SetMenuItemsAvailabilityResultSchema, ChatBotAvailabilityListCard),
  updateMenuItemPrice: toolCard(ChatBotPriceChangeResultSchema, ChatBotPriceChangeCard),
  updateBusinessProfile: toolCard(BusinessProfileResultSchema, ChatBotProfileChangeCard),
  setBusinessHours: toolCard(ChatBotWeeklyHoursChangeResultSchema, ChatBotWeeklyHoursChangeCard),
  setHoursOverride: toolCard(ChatBotSpecialHoursChangeResultSchema, ChatBotSpecialHoursChangeCard),
  removeHoursOverride: toolCard(ChatBotRemoveSpecialHoursResultSchema, ChatBotSpecialHoursRemovedCard),
} satisfies Readonly<Record<string, ChatBotToolCardEntry>>;

// -----
// hasOwn skips inherited keys like
// "constructor".
// -----
export function isChatBotToolCardName(tool: string): tool is keyof typeof CHAT_BOT_TOOL_CARDS {
  return Object.hasOwn(CHAT_BOT_TOOL_CARDS, tool);
}

// -----
// null when there's no card or no match:
// the caller falls back to a layout.
// -----
export function renderChatBotToolCard(
  tool: string,
  title: string,
  result: ChatBotJson,
): ReactElement | null {
  if (!isChatBotToolCardName(tool)) return null;
  return CHAT_BOT_TOOL_CARDS[tool].render(title, result);
}
