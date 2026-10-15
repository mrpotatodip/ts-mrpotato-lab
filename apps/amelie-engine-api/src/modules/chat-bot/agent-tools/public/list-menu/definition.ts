import { toolDefinition } from "@tanstack/ai";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { listMenu } from "./function";
import { ListMenuInputSchema, ListMenuResultSchema } from "./schema";

export const listMenuTool = defineChatBotTool({
  definition: toolDefinition({
    name: "listMenu",
    description:
      "Get this cafe's whole menu: categories with their notes, and items with " +
      "id, price, currency, Variants, availability and Dietary tags. Use it for " +
      "broad questions like \"what do you have for breakfast?\". It lists what the " +
      "conversation's location sells. " +
      "An empty list there can mean that country's prices are missing, " +
      "not that the cafe has no such item. " +
      "Omit locationId unless the customer names a different location; " +
      "then pass its name, slug or id. A value that is not one of the " +
      "cafe's locations is ignored and note says so. " +
      "With several locations and none set, it lists the whole cafe-wide menu " +
      "and note says availability can differ by location. " +
      "Prices and currency are those of the country in play: countryId, else " +
      "the conversation's country, else its location's country, else the " +
      "cafe's only country. Omit countryId unless the customer names a " +
      "different country; then pass its name, code (like CA) or id. A value " +
      "that is not one of the cafe's countries is ignored and note says so. " +
      "With several countries and none in play, price and currency are null " +
      "and note tells you to ask which location before quoting a price.",
    inputSchema: ListMenuInputSchema,
    outputSchema: ListMenuResultSchema,
  }),
  run: listMenu,
});
