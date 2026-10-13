import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { LocationNeededResultSchema } from "#/modules/chat-bot/schemas";
import { setBusinessHours } from "./function";
import { SetBusinessHoursInputSchema, SetBusinessHoursResultSchema } from "./schema";

export const setBusinessHoursTool = defineChatBotTool({
  definition: toolDefinition({
    name: "setBusinessHours",
    description:
      "Change this cafe's regular weekly hours for one weekday, from now on, " +
      "e.g. Saturday 08:00-14:00 or Monday closed. Pass weekday, isClosed, " +
      "and opensAt and closesAt as 24-hour HH:MM (null when closed). For a " +
      "single date use setHoursOverride instead. Only after the team member " +
      "confirmed. Applies to the conversation's location. " +
      "Omit locationId unless the team member names a different location; " +
      "then pass its name, slug or id. A value that is not one of the " +
      "cafe's locations changes nothing: the result asks which location. " +
      "With several locations and none chosen, the result has " +
      "needsLocation true: ask which one and use setThreadLocation.",
    inputSchema: SetBusinessHoursInputSchema,
    outputSchema: z.union([SetBusinessHoursResultSchema, LocationNeededResultSchema]),
  }),
  run: setBusinessHours,
});
