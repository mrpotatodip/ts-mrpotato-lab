import { createMiddleware } from "hono/factory";
import { UnauthorizedError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";

// -----
// A signed-in login, or a 401. Sets userId
// for the routes and middleware after it.
// -----
export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const userId = await c.get("deps").sessionUserId(c);
  if (!userId) throw new UnauthorizedError();
  c.set("userId", userId);
  await next();
});
