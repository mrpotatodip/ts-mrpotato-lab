import { z } from "zod";
import { HoursDateSchema, HoursFields, checkOpeningTimes } from "@repo/contracts/amelie";
import { ToolLocationRefSchema } from "#/modules/chat-bot/schemas";

export { SetHoursOverrideResultSchema, type SetHoursOverrideResult } from "@repo/contracts/chat-bots";

export const SetHoursOverrideInputSchema = z
  .strictObject({
    date: HoursDateSchema,
    locationId: ToolLocationRefSchema,
    ...HoursFields,
    note: z.string().trim().min(1).max(120).nullable(),
  })
  .superRefine(checkOpeningTimes);

export type SetHoursOverrideInput = z.infer<typeof SetHoursOverrideInputSchema>;
