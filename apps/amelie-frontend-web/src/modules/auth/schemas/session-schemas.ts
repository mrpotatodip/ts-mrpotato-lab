import { z } from "zod";

export const SessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  emailVerified: z.boolean(),
});

// Raw shape of GET /auth/get-session — includes session.token, which must
// never leave the server (see getSession in api/get-session-svc.ts).
export const SessionResponseSchema = z
  .object({
    session: z.object({
      id: z.string(),
      token: z.string(),
      userId: z.string(),
      expiresAt: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
    user: SessionUserSchema,
  })
  .nullable();

export const SignOutResponseSchema = z.object({
  success: z.boolean(),
});

export type SessionUser = z.infer<typeof SessionUserSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type SignOutResponse = z.infer<typeof SignOutResponseSchema>;
