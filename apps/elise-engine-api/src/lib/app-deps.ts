import type { Context } from "hono";
import { createAuth } from "#/lib/auth";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { userHasAccountEffect } from "#/modules/me";
import { monthSpendEffect, monthStartOf } from "#/modules/usage";
import type { AppEnv, AppDeps } from "#/types/variables";

const sessionUserId = async (c: Context<AppEnv>): Promise<string | undefined> => {
  const { auth, close } = createAuth(c);
  try {
    return (await auth.api.getSession({ headers: c.req.raw.headers }))?.user.id;
  } finally {
    close();
  }
};

const noSpend = { spentUsd: 0, scans: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, budgetOverrideUsd: null };

export const realAppDeps: AppDeps = {
  monthSpend: (env, accountId) =>
    env.DATABASE_URL ? runEffect(monthSpendEffect(dbConnect(env.DATABASE_URL), accountId, monthStartOf(new Date()))) : Promise.resolve(noSpend),
  sessionUserId,
  userHasAccount: (c, userId, accountId) => runEffect(userHasAccountEffect(dbConnect(c.env.DATABASE_URL), userId, accountId)),
};
