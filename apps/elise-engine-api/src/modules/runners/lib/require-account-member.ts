import { createMiddleware } from "hono/factory";
import { ForbiddenError, UnauthorizedError, ValidationError } from "#/lib/errors";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

// -----
// A signed-in login with any Role in the account named by
// x-account-id. Only listing Runners asks no more: a member who
// starts a Scan picks one. Adding and removing a Runner are
// Powers an admin holds (requirePower).
// -----
export const requireAccountMember = createMiddleware<AppEnv>(async (c, next) => {
  const deps = c.get("deps");
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
