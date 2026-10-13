import { z } from "zod";
import { ToolLocationRefSchema } from "#/modules/chat-bot/schemas";

export const GetBusinessProfileInputSchema = z.strictObject({
  locationId: ToolLocationRefSchema,
});

export type GetBusinessProfileInput = z.infer<typeof GetBusinessProfileInputSchema>;
