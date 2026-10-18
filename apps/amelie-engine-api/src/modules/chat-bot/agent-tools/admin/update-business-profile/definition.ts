import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { updateBusinessProfile } from "./function";
import { BusinessProfileResultSchema, LocationNeededResultSchema } from "#/modules/chat-bot/schemas";
import { UpdateBusinessProfileInputSchema } from "./schema";

export const updateBusinessProfileTool = defineChatBotTool({
  definition: toolDefinition({
    name: "updateBusinessProfile",
    description:
      "Change this cafe's contact facts: description, websiteUrl, phone, " +
      "email or address. Phone and address belong to one location: pass " +
      "locationId to pick it, otherwise the one in play is used. Pass the " +
      "new value for each field that changes and null for the rest. Only " +
      "after the team member confirmed.",
    inputSchema: UpdateBusinessProfileInputSchema,
    outputSchema: z.union([BusinessProfileResultSchema, LocationNeededResultSchema]),
  }),
  run: updateBusinessProfile,
});
