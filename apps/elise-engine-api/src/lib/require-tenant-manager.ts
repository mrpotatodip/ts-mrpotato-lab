import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { ForbiddenError, UnauthorizedError, ValidationError } from "#/lib/errors";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

// -----
// For routes that manage an Account's people: a
// signed-in login that is tenant_admin in the
// account named by x-account-id. The service
// token is not enough, because these writes name
// who made them. The dashboard server forwards
// the user's session.
// -----
export const assertTenantManager = async (c: Context<AppEnv>): Promise<string> => {
  const deps = c.get("deps");
  const userId = await deps.sessionUserId(c);
  if (!userId) throw new UnauthorizedError();

  const header = AccountHeaderSchema.safeParse({ "x-account-id": c.req.header("x-account-id") });
  if (!header.success) throw new ValidationError("x-account-id: must be the ID of one of your accounts");
  if (!(await deps.userManagesAccount(c, userId, header.data["x-account-id"]))) {
    throw new ForbiddenError("Only an admin of this account can do this");
  }
  return userId;
};

export const requireTenantManager = createMiddleware<AppEnv>(async (c, next) => {
  c.set("userId", await assertTenantManager(c));
  await next();
});

// -----
// The login that requireTenantManager let in. The type of
// c.get("userId") cannot say it is set, so a route asks
// here and a missing one is a 401, never an empty id.
// -----
export const userIdOf = (c: Context<AppEnv>): string => {
  const userId = c.get("userId");
  if (!userId) throw new UnauthorizedError();
  return userId;
};
