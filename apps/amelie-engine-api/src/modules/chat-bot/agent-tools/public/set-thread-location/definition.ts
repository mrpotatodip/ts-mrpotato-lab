import { toolDefinition } from "@tanstack/ai";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { setThreadLocation } from "./function";
import { SetThreadLocationInputSchema, SetThreadLocationResultSchema } from "./schema";

export const setThreadLocationTool = defineChatBotTool({
  definition: toolDefinition({
    name: "setThreadLocation",
    description:
      "Remember which of the cafe's locations this conversation is about, so " +
      "later hours and contact answers use it. Call it when the customer " +
      "picks a location, and again if they switch to another one. Pass " +
      "location as the location's name, slug or id. Only for cafes with " +
      "several locations. It does not change any cafe data.",
    inputSchema: SetThreadLocationInputSchema,
    outputSchema: SetThreadLocationResultSchema,
  }),
  run: setThreadLocation,
});
