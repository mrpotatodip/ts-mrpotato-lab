import { createMiddleware } from "hono/factory";
import { UnauthorizedError } from "#/lib/errors";
import { createAuth } from "#/lib/auth";
import type { AppEnv } from "#/types/variables";

// -----
// A signed-in login, or a 401. Sets userId
// for the routes and middleware after it.
// -----
export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const auth = createAuth(c);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new UnauthorizedError();
  c.set("userId", session.user.id);
  await next();
});
