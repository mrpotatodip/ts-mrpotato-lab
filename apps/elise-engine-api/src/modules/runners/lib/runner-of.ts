import type { Context } from "hono";
import type { RunnerIdentity } from "@repo/contracts/elise";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { UnauthorizedError } from "#/lib/errors";
import { runnerIdentitySvc } from "#/modules/runners/handlers";
import { bearerTokenOf } from "#/modules/runners/utils";
import type { AppEnv } from "#/types/variables";

// -----
// The Runner behind the bearer token, or a 401. Asking records
// that it was seen. A token that is unknown or revoked is the
// same 401, so a removed Runner learns only that it is out.
// -----
export const runnerOf = async (c: Context<AppEnv>): Promise<RunnerIdentity> => {
  const token = bearerTokenOf(c.req.header("authorization"));
  if (!token) throw new UnauthorizedError();
  const identity = await runEffect(runnerIdentitySvc(dbConnect(c.env.DATABASE_URL), token));
  if (!identity) throw new UnauthorizedError();
  return identity;
};
