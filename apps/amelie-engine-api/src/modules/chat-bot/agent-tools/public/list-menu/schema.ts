import { z } from "zod";
import { ToolCountryRefSchema, ToolLocationRefSchema } from "#/modules/chat-bot/schemas";

// -----
// The result shapes are contracts: the dashboard
// chat parses them to draw the menu card.
// -----
export {
  ListMenuResultSchema,
  MenuItemResultSchema,
  MenuLocationResultSchema,
  type ListMenuResult,
  type MenuItemResult,
  type MenuLocationResult,
} from "@repo/contracts/chat-bots";

export const ListMenuInputSchema = z.strictObject({
  locationId: ToolLocationRefSchema,
  countryId: ToolCountryRefSchema,
});

export type ListMenuInput = z.infer<typeof ListMenuInputSchema>;
