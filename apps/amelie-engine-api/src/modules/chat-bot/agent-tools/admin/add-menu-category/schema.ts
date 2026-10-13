import { z } from "zod";

export const AddMenuCategoryInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  note: z.string().trim().min(1).max(300).nullable(),
});

export type AddMenuCategoryInput = z.infer<typeof AddMenuCategoryInputSchema>;
