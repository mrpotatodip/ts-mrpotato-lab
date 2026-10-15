import { toolDefinition } from "@tanstack/ai";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { getBusinessProfile } from "./function";
import { z } from "zod";
import { BusinessProfileNeedsLocationResultSchema, BusinessProfileReadResultSchema } from "#/modules/chat-bot/schemas";
import { GetBusinessProfileInputSchema } from "./schema";

export const getBusinessProfileTool = defineChatBotTool({
  definition: toolDefinition({
    name: "getBusinessProfile",
    description:
      "Get this cafe's contact facts: description, website, phone, email and " +
      "address. A field is null when the cafe hasn't set it. Phone and address " +
      "belong to one location, the conversation's when one is set. " +
      "Omit locationId unless the customer names a different location; " +
      "then pass its name, slug or id. A value that is not one of the " +
      "cafe's locations is ignored and note says so. " +
      "With several locations and " +
      "none set, address and phone are null and needsLocation is true with " +
      "the locations to choose from. Description, website and email come " +
      "back only for the first country; they are null for a later country. " +
      "Ask which location only if the customer wants an address or phone, " +
      "then call setThreadLocation. If the conversation's country has exactly " +
      "one location it is used without asking; with several, the options " +
      "are only that country's.",
    inputSchema: GetBusinessProfileInputSchema,
    outputSchema: z.union([BusinessProfileNeedsLocationResultSchema, BusinessProfileReadResultSchema]),
  }),
  run: getBusinessProfile,
});
