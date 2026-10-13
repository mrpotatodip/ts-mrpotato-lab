import { z } from "zod";
import { SignUpSchema } from "@repo/contracts/amelie";

// -----
// Frontend-only: the API's success envelope
// around the contracts' SignUp response.
// -----
export const SignUpResponseSchema = z.object({
  data: SignUpSchema,
  error: z.null(),
});

export type SignUpResponse = z.infer<typeof SignUpResponseSchema>;
