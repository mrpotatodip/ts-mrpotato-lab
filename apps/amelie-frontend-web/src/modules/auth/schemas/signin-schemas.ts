import { z } from "zod";

export const SigninFormSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const SigninUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  emailVerified: z.boolean(),
});

export const SigninResponseSchema = z.object({
  redirect: z.boolean().optional(),
  token: z.string().nullable(),
  user: SigninUserSchema,
});

export type SigninFormValues = z.infer<typeof SigninFormSchema>;
export type SigninResponse = z.infer<typeof SigninResponseSchema>;
