import { z } from "zod";
import { SCHEDULE_WEEKDAYS } from "#/modules/schedule";
import { HoursFields, checkOpeningTimes } from "@repo/contracts/amelie";
import { ToolLocationRefSchema } from "#/modules/chat-bot/schemas";

export { SetBusinessHoursResultSchema, type SetBusinessHoursResult } from "@repo/contracts/chat-bots";

export const SetBusinessHoursInputSchema = z
  .strictObject({
    weekday: z.enum(SCHEDULE_WEEKDAYS),
    locationId: ToolLocationRefSchema,
    ...HoursFields,
  })
  .superRefine(checkOpeningTimes);

export type SetBusinessHoursInput = z.infer<typeof SetBusinessHoursInputSchema>;
