import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { updateMenuItemPrice } from "./function";
import { CountryNeededResultSchema, MenuItemPricingResultSchema } from "#/modules/chat-bot/schemas";
import { UpdateMenuItemPriceInputSchema } from "./schema";

export const updateMenuItemPriceTool = defineChatBotTool({
  definition: toolDefinition({
    name: "updateMenuItemPrice",
    description:
      "Change one menu item's price, in the business's currency (e.g. 5.25). " +
      "For an item with Variants pass the Variant's name (e.g. \"Large\"); " +
      "otherwise pass variantName null. Pass the item id from listMenu or " +
      "findMenuItems. Only after the team member confirmed. A price belongs " +
      "to one country: pass countryId (the country's name, code like CA, or " +
      "id) when the team member names one; omit it for a cafe with a single " +
      "country. With several countries and none named, or a value that is " +
      "not one of the cafe's countries, nothing changes and the result has " +
      "needsCountry true with the countries: ask which country's price, " +
      "then call again with countryId.",
    inputSchema: UpdateMenuItemPriceInputSchema,
    outputSchema: z.union([MenuItemPricingResultSchema, CountryNeededResultSchema]),
  }),
  run: updateMenuItemPrice,
});
