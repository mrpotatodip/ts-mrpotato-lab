import { toolDefinition } from "@tanstack/ai";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { setMenuItemAvailability } from "./function";
import { MenuItemPricingResultSchema } from "#/modules/chat-bot/schemas";
import { SetMenuItemAvailabilityInputSchema } from "./schema";

export const setMenuItemAvailabilityTool = defineChatBotTool({
  definition: toolDefinition({
    name: "setMenuItemAvailability",
    description:
      "Mark one menu item sold out (isAvailable false) or back on (true). " +
      "Pass its id from listMenu or findMenuItems. Only after the team member " +
      "confirmed.",
    inputSchema: SetMenuItemAvailabilityInputSchema,
    outputSchema: MenuItemPricingResultSchema,
  }),
  run: setMenuItemAvailability,
});
