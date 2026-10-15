import { toolDefinition } from "@tanstack/ai";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { findMenuItems } from "./function";
import { FindMenuItemsInputSchema, FindMenuItemsResultSchema } from "./schema";

export const findMenuItemsTool = defineChatBotTool({
  definition: toolDefinition({
    name: "findMenuItems",
    description:
      "Search this cafe's menu. text matches item names, descriptions, " +
      "categories and category notes (e.g. \"latte\", \"oat\"). dietaryTag is " +
      "a tag slug (e.g. \"vegan\", \"gluten-free\"). Pass null for the one you " +
      "don't use. " +
      "A tag returns tagged items first, then items whose categoryNote " +
      "offers it (e.g. gluten-free bread on sandwiches). For those, say what " +
      "the note says, not that the item itself is tagged. " +
      "It searches what the conversation's location sells. " +
      "An empty list there can mean that country's prices are missing, " +
      "not that the cafe has no such item. " +
      "Omit locationId unless the customer names a different location; " +
      "then pass its name, slug or id. A value that is not one of the " +
      "cafe's locations is ignored and note says so. " +
      "With several locations and none set it searches " +
      "the whole cafe-wide menu and note says availability can differ by location. " +
      "Prices and currency are those of the country in play: countryId, else " +
      "the conversation's country, else its location's country, else the " +
      "cafe's only country. Omit countryId unless the customer names a " +
      "different country; then pass its name, code (like CA) or id. A value " +
      "that is not one of the cafe's countries is ignored and note says so. " +
      "With several countries and none in play, price and currency are null " +
      "and note tells you to ask which location before quoting a price. " +
      "Returns at most 20 items with their id, category and categoryNote.",
    inputSchema: FindMenuItemsInputSchema,
    outputSchema: FindMenuItemsResultSchema,
  }),
  run: findMenuItems,
});
