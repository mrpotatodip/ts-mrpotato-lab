import { z } from "zod";
import { SIGN_UP_INVITE_CODE_MAX } from "@repo/contracts/amelie";

// -----
// `/signup?code=K7M2-9QXA-4TWB` fills the invite
// code field. The router turns a code made only of
// digits into a number, so both are read. Anything
// else is ignored and the field stays empty.
// -----
export const SignUpSearchSchema = z.object({
  code: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim().slice(0, SIGN_UP_INVITE_CODE_MAX))
    .optional()
    .catch(undefined),
});

export type SignUpSearch = z.infer<typeof SignUpSearchSchema>;
