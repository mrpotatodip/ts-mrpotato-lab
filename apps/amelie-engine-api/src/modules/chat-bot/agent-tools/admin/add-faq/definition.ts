import { toolDefinition } from "@tanstack/ai";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { addFaq } from "./function";
import { z } from "zod";
import { FaqResultSchema, FaqScopeNeededResultSchema } from "#/modules/chat-bot/schemas";
import { AddFaqInputSchema } from "./schema";

export const addFaqTool = defineChatBotTool({
  definition: toolDefinition({
    name: "addFaq",
    description:
      "Add one FAQ to this cafe: a question customers ask and the cafe's " +
      "answer. Pass a categoryId from listFaqs, or null for General. Only " +
      "after the team member confirmed the exact wording. It applies to every " +
      "location unless you pass scope: a country (name, code like CA, or id) " +
      "for all that country's locations, or one location (name or id). Omit " +
      "scope for all locations. A scope that is not one of the cafe's " +
      "countries or locations changes nothing and the result has needsScope " +
      "true with the choices: ask which, then call again.",
    inputSchema: AddFaqInputSchema,
    outputSchema: z.union([FaqResultSchema, FaqScopeNeededResultSchema]),
  }),
  run: addFaq,
});
