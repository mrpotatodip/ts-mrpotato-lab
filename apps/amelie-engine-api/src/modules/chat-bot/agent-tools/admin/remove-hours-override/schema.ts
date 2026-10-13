import { z } from "zod";
import { HoursDateSchema } from "@repo/contracts/amelie";
import { ToolLocationRefSchema } from "#/modules/chat-bot/schemas";

export { RemoveHoursOverrideResultSchema, type RemoveHoursOverrideResult } from "@repo/contracts/chat-bots";

export const RemoveHoursOverrideInputSchema = z.strictObject({
  date: HoursDateSchema,
  locationId: ToolLocationRefSchema,
});

export type RemoveHoursOverrideInput = z.infer<typeof RemoveHoursOverrideInputSchema>;
