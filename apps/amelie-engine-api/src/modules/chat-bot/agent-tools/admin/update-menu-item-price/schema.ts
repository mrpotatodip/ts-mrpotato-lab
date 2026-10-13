import { z } from "zod";
import { ToolCountryRefSchema } from "#/modules/chat-bot/schemas";

export const UpdateMenuItemPriceInputSchema = z.strictObject({
  itemId: z.uuid(),
  variantName: z.string().trim().min(1).max(40).nullable(),
  countryId: ToolCountryRefSchema,
  price: z.number().positive().max(10000),
});

export type UpdateMenuItemPriceInput = z.infer<typeof UpdateMenuItemPriceInputSchema>;
