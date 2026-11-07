import { createMiddleware } from "hono/factory";
import { ForbiddenError, UnauthorizedError, ValidationError } from "#/lib/errors";
import { hasServiceToken } from "#/lib/require-service-token";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

// -----
// Two ways in, one rule: x-account-id names the
// account. The dashboard server sends the shared
// service token and the account it vouches for.
// A signed-in login sends its session and may use
// only an account where its Party holds a Role.
// -----
export const requireScanAccess = createMiddleware<AppEnv>(async (c, next) => {
  if (await hasServiceToken(c)) return next();

  const deps = c.get("authDeps");
  const userId = await deps.sessionUserId(c);
  if (!userId) throw new UnauthorizedError();

  const header = AccountHeaderSchema.safeParse({ "x-account-id": c.req.header("x-account-id") });
  if (!header.success) throw new ValidationError("x-account-id: must be the ID of one of your accounts");
  if (!(await deps.userHasAccount(c, userId, header.data["x-account-id"]))) {
    throw new ForbiddenError("You have no role in this account");
  }
  c.set("userId", userId);
  await next();
});
