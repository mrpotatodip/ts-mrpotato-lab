import { z } from "zod";

export const SetMenuItemAvailabilityInputSchema = z.strictObject({
  itemId: z.uuid(),
  isAvailable: z.boolean(),
});

export type SetMenuItemAvailabilityInput = z.infer<typeof SetMenuItemAvailabilityInputSchema>;
