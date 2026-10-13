import { createMiddleware } from "hono/factory";
import { ForbiddenError } from "#/lib/errors";
import { SIGN_UP_INVALID_INVITE } from "#/modules/sign-up/constants";
import type { AppEnv } from "#/types/variables";

// -----
// Per IP, before the body is read. Over the limit
// it answers exactly like a wrong invite code
// (403, same body), so a guesser cannot tell a
// refused code from a refused request. No binding
// (local dev): not limited. No IP: one key.
// -----
export const requireSignUpLimit = createMiddleware<AppEnv>(async (c, next) => {
  const limiter = c.env.SIGN_UP_LIMITER;
  if (limiter) {
    const key = c.req.header("cf-connecting-ip") ?? "local";
    const { success } = await limiter.limit({ key });
    if (!success) throw new ForbiddenError(SIGN_UP_INVALID_INVITE);
  }
  await next();
});
