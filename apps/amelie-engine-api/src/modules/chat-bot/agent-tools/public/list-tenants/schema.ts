import { z } from "zod";

export const ListTenantsInputSchema = z.strictObject({});

export type ListTenantsInput = z.infer<typeof ListTenantsInputSchema>;
