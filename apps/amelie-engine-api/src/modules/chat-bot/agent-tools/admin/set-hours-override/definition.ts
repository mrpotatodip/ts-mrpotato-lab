import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { LocationNeededResultSchema } from "#/modules/chat-bot/schemas";
import { setHoursOverride } from "./function";
import { SetHoursOverrideInputSchema, SetHoursOverrideResultSchema } from "./schema";

export const setHoursOverrideTool = defineChatBotTool({
  definition: toolDefinition({
    name: "setHoursOverride",
    description:
      "Save this cafe's hours for one date, replacing the weekly hours that " +
      "day, e.g. closed on 2026-12-25 or open 08:00-20:00 on 2026-12-13. " +
      "Pass date as YYYY-MM-DD, isClosed, opensAt and closesAt as 24-hour " +
      "HH:MM (null when closed), and a short note or null. Saving the same " +
      "date again replaces it. Only after the team member confirmed. Applies " +
      "to the conversation's location. " +
      "Omit locationId unless the team member names a different location; " +
      "then pass its name, slug or id. A value that is not one of the " +
      "cafe's locations changes nothing: the result asks which location. " +
      "With " +
      "several locations and none chosen, the result has needsLocation true: " +
      "ask which one and use setThreadLocation.",
    inputSchema: SetHoursOverrideInputSchema,
    outputSchema: z.union([SetHoursOverrideResultSchema, LocationNeededResultSchema]),
  }),
  run: setHoursOverride,
});
