import { toolDefinition } from "@tanstack/ai";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { listFaqs } from "./function";
import { ListFaqsInputSchema, ListFaqsResultSchema } from "./schema";

export const listFaqsTool = defineChatBotTool({
  definition: toolDefinition({
    name: "listFaqs",
    description:
      "Get this cafe's FAQs (questions and answers it wrote, e.g. parking, " +
      "kids, dogs, Wi-Fi) and its FAQ categories. An FAQ with no category is " +
      "under General. It returns the FAQs for every location, plus the " +
      "conversation's country's (country-wide FAQs, e.g. accepted payment " +
      "methods) and the conversation's location's own. " +
      "Omit locationId unless the customer names a different location; " +
      "then pass its name, slug or id. A value that is not one of the " +
      "cafe's locations is ignored and note says so. " +
      "With several locations or countries and none set, only the all-location FAQs come back and note says so.",
    inputSchema: ListFaqsInputSchema,
    outputSchema: ListFaqsResultSchema,
  }),
  run: listFaqs,
});
