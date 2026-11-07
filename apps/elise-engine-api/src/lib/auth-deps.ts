import type { Context } from "hono";
import { createAuth } from "#/lib/auth";
import { dbConnect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { userHasAccountEffect } from "#/modules/me";
import type { AppEnv, AuthDeps } from "#/types/variables";

const sessionUserId = async (c: Context<AppEnv>): Promise<string | undefined> => {
  const { auth, close } = createAuth(c);
  try {
    return (await auth.api.getSession({ headers: c.req.raw.headers }))?.user.id;
  } finally {
    close();
  }
};

export const realAuthDeps: AuthDeps = {
  sessionUserId,
  userHasAccount: (c, userId, accountId) => runEffect(userHasAccountEffect(dbConnect(c.env.DATABASE_URL), userId, accountId)),
};
