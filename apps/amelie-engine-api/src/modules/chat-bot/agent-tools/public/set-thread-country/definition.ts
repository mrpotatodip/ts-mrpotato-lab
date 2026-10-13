import { toolDefinition } from "@tanstack/ai";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { setThreadCountry } from "./function";
import { SetThreadCountryInputSchema, SetThreadCountryResultSchema } from "./schema";

export const setThreadCountryTool = defineChatBotTool({
  definition: toolDefinition({
    name: "setThreadCountry",
    description:
      "Remember which of the cafe's countries this conversation is about, so " +
      "later menu prices and currencies use it. Call it when the customer says " +
      "which country they are in, or picks one, and again if they switch. " +
      "Pass country as the country's name, code (like CA) or id. Only for " +
      "cafes that sell in several countries. If the country has exactly one " +
      "location, hours and address answers use it without asking. It does not " +
      "change any cafe data.",
    inputSchema: SetThreadCountryInputSchema,
    outputSchema: SetThreadCountryResultSchema,
  }),
  run: setThreadCountry,
});
