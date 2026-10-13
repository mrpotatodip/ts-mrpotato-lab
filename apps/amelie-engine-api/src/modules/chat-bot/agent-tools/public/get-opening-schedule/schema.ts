import { z } from "zod";
import { ToolLocationRefSchema } from "#/modules/chat-bot/schemas";

export { GetOpeningScheduleResultSchema, type GetOpeningScheduleResult } from "@repo/contracts/chat-bots";

export const GetOpeningScheduleInputSchema = z.strictObject({
  locationId: ToolLocationRefSchema,
});

export type GetOpeningScheduleInput = z.infer<typeof GetOpeningScheduleInputSchema>;
