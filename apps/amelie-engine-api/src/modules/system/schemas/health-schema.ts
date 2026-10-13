import { z } from "zod";

export const HealthSchema = z.object({
  ok: z.boolean().meta({ example: true }),
  version: z.string().meta({ example: "1.0.2" }),
});

export type Health = z.infer<typeof HealthSchema>;
