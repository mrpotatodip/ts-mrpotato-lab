import { toolDefinition } from "@tanstack/ai";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { updateFaq } from "./function";
import { z } from "zod";
import { FaqResultSchema, FaqScopeNeededResultSchema } from "#/modules/chat-bot/schemas";
import { UpdateFaqInputSchema } from "./schema";

export const updateFaqTool = defineChatBotTool({
  definition: toolDefinition({
    name: "updateFaq",
    description:
      "Change one FAQ's question, answer, scope or any mix. Pass its id from " +
      "listFaqs and null for the part that stays the same. To move it, pass " +
      "scope: \"all\" for every location, a country (name, code like CA, or " +
      "id) or one location (name or id); omit scope to keep where it " +
      "applies. A scope that is not one of the cafe's countries or locations " +
      "changes nothing and the result has needsScope true with the choices: " +
      "ask which, then call again. Only after the team member confirmed the " +
      "exact wording.",
    inputSchema: UpdateFaqInputSchema,
    outputSchema: z.union([FaqResultSchema, FaqScopeNeededResultSchema]),
  }),
  run: updateFaq,
});
