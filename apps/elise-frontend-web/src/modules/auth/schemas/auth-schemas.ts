import { z } from "zod";
import { SignUpBodySchema } from "@repo/contracts/elise";

export const SignInSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const SignUpInputSchema = SignUpBodySchema;

export type SignUpInput = z.infer<typeof SignUpInputSchema>;
