import { toolDefinition } from "@tanstack/ai";
import type { ChatBotTableDisplayOptions } from "@repo/contracts/chat-bots";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { showMenuItems } from "./function";
import { ShowMenuItemsInputSchema, ShowMenuItemsResultSchema } from "./schema";

export const showMenuItemsTool = defineChatBotTool({
  definition: toolDefinition({
    name: "showMenuItems",
    description:
      "Show the customer cards for menu items your reply recommends or " +
      "describes. Pass their id values from listMenu or findMenuItems, at most 8. " +
      "Cards are priced in the country in play (the conversation's, its " +
      "location's, the cafe's only), and items not sold there are left out. " +
      "Omit countryId unless the customer names a different country. With " +
      "several countries and none in play the cards show no price.",
    inputSchema: ShowMenuItemsInputSchema,
    outputSchema: ShowMenuItemsResultSchema,
  }),
  run: showMenuItems,
  display: "table",
  displayOptions: { rows: "items", columns: ["name", "price"] } satisfies ChatBotTableDisplayOptions,
});
