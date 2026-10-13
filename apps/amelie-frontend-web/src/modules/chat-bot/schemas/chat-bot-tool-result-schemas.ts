import { z } from "zod";
import {
  BusinessProfileNeedsLocationResultSchema,
  BusinessProfileReadResultSchema,
  CountryNeededResultSchema,
  FaqResultSchema,
  FaqScopeNeededResultSchema,
  GetOpeningScheduleResultSchema,
  LocationNeededResultSchema,
  MenuItemPricingResultSchema,
  SetBusinessHoursResultSchema,
  SetHoursOverrideResultSchema,
} from "@repo/contracts/chat-bots";

// -----
// A tool that can ask for a choice first returns
// either the answer or the choice. The choice goes
// first: the answer's schema would also accept it
// and drop the fields that say a choice is needed.
// -----
export const ChatBotOpeningScheduleResultSchema = z.union([
  LocationNeededResultSchema,
  GetOpeningScheduleResultSchema,
]);

export const ChatBotBusinessProfileResultSchema = z.union([
  BusinessProfileNeedsLocationResultSchema,
  BusinessProfileReadResultSchema,
]);

export const ChatBotFaqChangeResultSchema = z.union([FaqScopeNeededResultSchema, FaqResultSchema]);

export const ChatBotPriceChangeResultSchema = z.union([CountryNeededResultSchema, MenuItemPricingResultSchema]);

export const ChatBotWeeklyHoursChangeResultSchema = z.union([
  LocationNeededResultSchema,
  SetBusinessHoursResultSchema,
]);

export const ChatBotSpecialHoursChangeResultSchema = z.union([
  LocationNeededResultSchema,
  SetHoursOverrideResultSchema,
]);

export const ChatBotRemoveSpecialHoursResultSchema = z.union([
  LocationNeededResultSchema,
  z.object({ date: z.string() }),
]);

export type ChatBotOpeningScheduleResult = z.infer<typeof ChatBotOpeningScheduleResultSchema>;
export type ChatBotBusinessProfileResult = z.infer<typeof ChatBotBusinessProfileResultSchema>;
export type ChatBotFaqChangeResult = z.infer<typeof ChatBotFaqChangeResultSchema>;
export type ChatBotPriceChangeResult = z.infer<typeof ChatBotPriceChangeResultSchema>;
export type ChatBotWeeklyHoursChangeResult = z.infer<typeof ChatBotWeeklyHoursChangeResultSchema>;
export type ChatBotSpecialHoursChangeResult = z.infer<typeof ChatBotSpecialHoursChangeResultSchema>;
export type ChatBotRemoveSpecialHoursResult = z.infer<typeof ChatBotRemoveSpecialHoursResultSchema>;
