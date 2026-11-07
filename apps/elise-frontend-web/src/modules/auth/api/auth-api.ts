import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { engineFetch, jsonPost } from "#/lib/engine-client";
import { SignInSchema, SignUpInputSchema } from "../schemas";
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

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const session = await findSession();
  if (session) await engineFetch("/auth/sign-out", { method: "POST" }, { token: session.token }).catch(() => undefined);
  clearSessionToken();
});
