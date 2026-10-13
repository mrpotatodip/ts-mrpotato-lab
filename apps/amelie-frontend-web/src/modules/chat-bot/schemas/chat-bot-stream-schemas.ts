import { z } from "zod";

export const ChatBotToolTurnMetadataSchema = z.object({
  tanstack: z.object({ finishReason: z.literal("tool_calls") }),
});
