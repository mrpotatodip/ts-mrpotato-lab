import { z, type ZodType } from "zod";

export function apiResponseSchema<T extends ZodType>(dataSchema: T) {
  return z
    .object({
      data: dataSchema.nullable(),
      error: z.string().nullable(),
    })
    .superRefine((val, ctx) => {
      // -----
      // zod v4 can't resolve `data`'s type through
      // this generic shape — cast rather than fight it.
      // -----
      const row = val as { data: unknown; error: string | null };
      if (row.data === null && row.error === null) {
        ctx.addIssue({
          code: "custom",
          message: "Either data or error must be set",
          path: ["error"],
        });
      }
      if (row.data !== null && row.error !== null) {
        ctx.addIssue({
          code: "custom",
          message: "data and error cannot both be set",
          path: ["error"],
        });
      }
    });
}
