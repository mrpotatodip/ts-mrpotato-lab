import { toolDefinition } from "@tanstack/ai";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { getOpeningSchedule } from "./function";
import { z } from "zod";
import { LocationNeededResultSchema } from "#/modules/chat-bot/schemas";
import { GetOpeningScheduleInputSchema, GetOpeningScheduleResultSchema } from "./schema";

export const getOpeningScheduleTool = defineChatBotTool({
  definition: toolDefinition({
    name: "getOpeningSchedule",
    description:
      "Get one location's opening schedule in that location's own timezone: " +
      "today's date and time, whether it is open now, the weekly hours, the " +
      "next 7 days, and upcoming special dates such as holidays or closures. " +
      "It uses the conversation's location when one is set. " +
      "Omit locationId unless the customer names a different location; " +
      "then pass its name, slug or id. A value that is not one of the " +
      "cafe's locations is ignored and note says so. " +
      "With several locations and none set, " +
      "the result has needsLocation true and the locations to choose from, so " +
      "ask the customer which one, then call setThreadLocation. " +
      "If the conversation's country has exactly one location it is used " +
      "without asking; with several, the options are only that country's.",
    inputSchema: GetOpeningScheduleInputSchema,
    outputSchema: z.union([GetOpeningScheduleResultSchema, LocationNeededResultSchema]),
  }),
  run: getOpeningSchedule,
});
