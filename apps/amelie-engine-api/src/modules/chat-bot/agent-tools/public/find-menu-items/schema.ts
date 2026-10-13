import { z } from "zod";
import { ToolCountryRefSchema, ToolLocationRefSchema } from "#/modules/chat-bot/schemas";

// -----
// The result shape is a contract: the dashboard
// chat parses it to draw the search card.
// -----
export { FindMenuItemsResultSchema, type FindMenuItemsResult } from "@repo/contracts/chat-bots";

export const FindMenuItemsInputSchema = z
  .strictObject({
    text: z.string().trim().min(1).max(60).nullable(),
    dietaryTag: z.string().trim().min(1).max(30).nullable(),
    locationId: ToolLocationRefSchema,
    countryId: ToolCountryRefSchema,
  })
  .refine((input) => input.text !== null || input.dietaryTag !== null, {
    message: "pass text, dietaryTag or both",
  });

export type FindMenuItemsInput = z.infer<typeof FindMenuItemsInputSchema>;
