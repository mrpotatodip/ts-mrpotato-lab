import { z } from "zod";

const optionalCategory = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(z.string().min(1).max(36))
  .optional()
  .catch(undefined);

export const FaqSearchSchema = z.object({
  category: optionalCategory,
});

export type FaqSearch = z.infer<typeof FaqSearchSchema>;
