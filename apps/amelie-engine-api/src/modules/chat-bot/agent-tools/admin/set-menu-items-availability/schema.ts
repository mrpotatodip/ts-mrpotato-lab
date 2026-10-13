import { z } from "zod";
import { CHAT_BOT_MAX_BATCH_ITEMS } from "#/modules/chat-bot/constants";

export { SetMenuItemsAvailabilityResultSchema, type SetMenuItemsAvailabilityResult } from "@repo/contracts/chat-bots";

export const SetMenuItemsAvailabilityInputSchema = z.strictObject({
  itemIds: z.array(z.uuid()).min(1).max(CHAT_BOT_MAX_BATCH_ITEMS),
  isAvailable: z.boolean(),
});

export type SetMenuItemsAvailabilityInput = z.infer<typeof SetMenuItemsAvailabilityInputSchema>;
