import type { AccessPower } from "@repo/contracts/elise";
import { createMiddleware } from "hono/factory";
import { ForbiddenError, UnauthorizedError, ValidationError } from "#/lib/errors";
import { hasServiceToken } from "#/lib/require-service-token";
import { AccountHeaderSchema } from "#/modules/scans/schemas";
import type { AppEnv } from "#/types/variables";

// -----
// A Watcher holds only the Summary Power, so the two
// reads the Summary page makes are open to it. Every
// other route behind this guard needs the Dashboard
// Power, so a Watcher cannot read a scan or start one.
// -----
const SUMMARY_READS = [/^\/repos\/?$/, /^\/repos\/[^/]+\/findings\/?$/] as const;

const powerFor = (method: string, path: string): AccessPower =>
  method === "GET" && SUMMARY_READS.some((pattern) => pattern.test(path)) ? "company:summary:read" : "company:dashboard:read";

// -----
// Two ways in, one rule: x-account-id names the
// account. The dashboard server sends the shared
// service token and the account it vouches for.
// A signed-in login sends its session and may use
// only an account where its Party holds a Role that
// holds the route's Power.
// -----
export const requireScanAccess = createMiddleware<AppEnv>(async (c, next) => {
  if (await hasServiceToken(c)) return next();

  const deps = c.get("deps");
  const userId = await deps.sessionUserId(c);
  if (!userId) throw new UnauthorizedError();

  const header = AccountHeaderSchema.safeParse({ "x-account-id": c.req.header("x-account-id") });
  if (!header.success) throw new ValidationError("x-account-id: must be the ID of one of your accounts");
  if (!(await deps.userHasAccount(c, userId, header.data["x-account-id"]))) {
    throw new ForbiddenError("You have no role in this account");
  }
  if (!(await deps.userHasPower(c, userId, header.data["x-account-id"], powerFor(c.req.method, c.req.path)))) {
    throw new ForbiddenError("Your role in this account cannot open this");
  }
  c.set("userId", userId);
  await next();
});
