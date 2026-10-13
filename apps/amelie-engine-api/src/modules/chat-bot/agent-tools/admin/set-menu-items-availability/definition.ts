import { toolDefinition } from "@tanstack/ai";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { setMenuItemsAvailability } from "./function";
import { SetMenuItemsAvailabilityInputSchema, SetMenuItemsAvailabilityResultSchema } from "./schema";

export const setMenuItemsAvailabilityTool = defineChatBotTool({
  definition: toolDefinition({
    name: "setMenuItemsAvailability",
    description:
      "Mark several menu items sold out (isAvailable false) or back on (true) " +
      "in one call, up to 10. Pass their ids from listMenu or findMenuItems. " +
      "Use it whenever more than one item changes; use setMenuItemAvailability " +
      "for a single item. An id that is not one of the cafe's items comes back " +
      "in notFound and the rest are still changed. Only after the team member " +
      "confirmed.",
    inputSchema: SetMenuItemsAvailabilityInputSchema,
    outputSchema: SetMenuItemsAvailabilityResultSchema,
  }),
  run: setMenuItemsAvailability,
});
