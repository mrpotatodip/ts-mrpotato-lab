import { z } from "zod";

// -----
// Responses: who the signed-in login is, as far
// as access goes. Only the platform flag; cafe
// roles come with each Tenant.
// -----
export const MeSchema = z.object({
  isSuperuser: z.boolean(),
});

export type Me = z.infer<typeof MeSchema>;
