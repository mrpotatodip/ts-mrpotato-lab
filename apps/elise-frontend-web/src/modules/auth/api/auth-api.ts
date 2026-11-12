import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { EngineError, engineFetch, jsonPost } from "#/lib/engine-client";
import { AUTH_COPY } from "../constants";
import { ForgotPasswordSchema, ResetPasswordSchema, SignInSchema, SignUpInputSchema } from "../schemas";
import { clearSessionToken, findSession, saveSessionToken } from "../server/session";

export const fetchSession = createServerFn({ method: "GET" }).handler(async () => (await findSession())?.user ?? null);

const SignInResponseSchema = z.object({ token: z.string() });

export const signIn = createServerFn({ method: "POST" })
  .validator(SignInSchema)
  .handler(async ({ data }) => {
    const res = await engineFetch("/auth/sign-in/email", jsonPost(JSON.stringify(data)));
    saveSessionToken(SignInResponseSchema.parse(await res.json()).token);
  });

export const signUp = createServerFn({ method: "POST" })
  .validator(SignUpInputSchema)
  .handler(async ({ data }) => {
    await engineFetch("/sign-up", jsonPost(JSON.stringify(data)));
    const res = await engineFetch("/auth/sign-in/email", jsonPost(JSON.stringify({ email: data.email, password: data.password })));
    saveSessionToken(SignInResponseSchema.parse(await res.json()).token);
  });

// -----
// The engine answers the same whether or not the email has an account, so the
// page can say nothing about which ones do.
// -----
export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(ForgotPasswordSchema)
  .handler(async ({ data }) => {
    await engineFetch("/auth/request-password-reset", jsonPost(JSON.stringify(data)));
  });

// -----
// A token the engine refuses (400) is spent, expired or made up: say that, not
// the engine's "Invalid token".
// -----
export const resetPassword = createServerFn({ method: "POST" })
  .validator(ResetPasswordSchema)
  .handler(async ({ data }) => {
    try {
      await engineFetch("/auth/reset-password", jsonPost(JSON.stringify({ token: data.token, newPassword: data.password })));
    } catch (error) {
      if (error instanceof EngineError && error.status === 400) throw new Error(AUTH_COPY.reset.expired, { cause: error });
      throw error;
    }
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const session = await findSession();
  if (session) await engineFetch("/auth/sign-out", { method: "POST" }, { token: session.token }).catch(() => undefined);
  clearSessionToken();
});
