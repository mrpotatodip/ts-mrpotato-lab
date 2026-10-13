import { z } from "zod";
import { CreatedInviteCodeSchema, InviteCodeSchema, MeSchema } from "@repo/contracts/amelie";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const AdminAccessResponseSchema = apiResponseSchema(MeSchema);

export const InviteCodeListResponseSchema = apiResponseSchema(z.array(InviteCodeSchema));
export const InviteCodeResponseSchema = apiResponseSchema(InviteCodeSchema);
export const CreatedInviteCodeResponseSchema = apiResponseSchema(CreatedInviteCodeSchema);

// -----
// What the generator form holds. Every field is a string,
// as typed; toCreateInviteCodeBody turns it into the body.
// -----
export const InviteCodeFormValuesSchema = z.object({
  note: z.string(),
  maxUses: z.string(),
  expiresAt: z.string(),
});

export type InviteCodeFormValues = z.infer<typeof InviteCodeFormValuesSchema>;
