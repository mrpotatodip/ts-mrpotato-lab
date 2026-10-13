import { createMiddleware } from "hono/factory";
import { AUTH_SIGN_IN_LIMITED } from "#/constants";
import { TooManyRequestsError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";

// -----
// Per IP, before better-auth sees the
// password. Local dev has no IP: one key.
// -----
export const requireSignInLimit = createMiddleware<AppEnv>(async (c, next) => {
  const key = c.req.header("cf-connecting-ip") ?? "local";
  const { success } = await c.env.AUTH_SIGN_IN_LIMITER.limit({ key });
  if (!success) throw new TooManyRequestsError(AUTH_SIGN_IN_LIMITED, "SIGN_IN_RATE_LIMITED");
  await next();
});
