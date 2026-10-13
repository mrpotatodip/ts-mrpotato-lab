import { z } from "zod";
import { ToolCountryRefSchema } from "#/modules/chat-bot/schemas";

export { ShowMenuItemsResultSchema, type ShowMenuItemsResult } from "@repo/contracts/chat-bots";

export const ShowMenuItemsInputSchema = z.strictObject({
  ids: z.array(z.string()).min(1).max(8),
  countryId: ToolCountryRefSchema,
});

export type ShowMenuItemsInput = z.infer<typeof ShowMenuItemsInputSchema>;
