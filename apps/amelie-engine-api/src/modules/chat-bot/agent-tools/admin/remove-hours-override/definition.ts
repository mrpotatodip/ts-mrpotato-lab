import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { LocationNeededResultSchema } from "#/modules/chat-bot/schemas";
import { removeHoursOverride } from "./function";
import { RemoveHoursOverrideInputSchema, RemoveHoursOverrideResultSchema } from "./schema";

export const removeHoursOverrideTool = defineChatBotTool({
  definition: toolDefinition({
    name: "removeHoursOverride",
    description:
      "Remove this cafe's special hours for one date (YYYY-MM-DD), so the " +
      "weekly hours apply that day again. Only after the team member confirmed. " +
      "Applies to the conversation's location. " +
      "Omit locationId unless the team member names a different location; " +
      "then pass its name, slug or id. A value that is not one of the " +
      "cafe's locations changes nothing: the result asks which location. " +
      "With several locations and none chosen, the result has needsLocation " +
      "true: ask which one and use setThreadLocation.",
    inputSchema: RemoveHoursOverrideInputSchema,
    outputSchema: z.union([RemoveHoursOverrideResultSchema, LocationNeededResultSchema]),
  }),
  run: removeHoursOverride,
});
