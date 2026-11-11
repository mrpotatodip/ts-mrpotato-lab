import { z } from "zod";

// -----
// Responses: who the signed-in login is, which
// Accounts it can use and whether it is platform
// staff.
// -----
export const MeAccountSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  role: z.string(),
  roleLabel: z.string(),
  // What the role may do here (ACCESS_POWERS strings). Optional while an older engine does not send it.
  powers: z.array(z.string()).optional(),
});

export const MeSchema = z.object({
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  partyType: z.string(),
  isSuperuser: z.boolean(),
  accounts: z.array(MeAccountSchema),
});

export type MeAccount = z.infer<typeof MeAccountSchema>;
export type Me = z.infer<typeof MeSchema>;
