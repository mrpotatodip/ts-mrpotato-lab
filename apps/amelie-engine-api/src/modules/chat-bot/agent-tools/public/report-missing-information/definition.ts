import { toolDefinition } from "@tanstack/ai";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { reportMissingInformation } from "./function";
import {
  ReportMissingInformationInputSchema,
  ReportMissingInformationResultSchema,
} from "./schema";

export const reportMissingInformationTool = defineChatBotTool({
  definition: toolDefinition({
    name: "reportMissingInformation",
    description:
      "Call this whenever any part of the customer's question can't be " +
      "answered from the business information. Pass a 2-4 word topic, " +
      'e.g. "parking" or "outside cake".',
    inputSchema: ReportMissingInformationInputSchema,
    outputSchema: ReportMissingInformationResultSchema,
  }),
  run: reportMissingInformation,
  display: null,
});
