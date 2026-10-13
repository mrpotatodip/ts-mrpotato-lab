import { createMiddleware } from "hono/factory";
import { db_connect, type DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { NotFoundError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import { getMeSvc } from "#/modules/me";
import { ADMIN_NOT_FOUND } from "#/modules/admin/constants";

// -----
// Runs after requireSession: only a superuser
// reaches /admin. Anyone else gets a 404, so
// the area's existence never leaks. The database
// connection is passed in so tests can hand it
// an in-process database.
// -----
export const createRequireSuperuser = (connect: (env: AppEnv["Bindings"]) => DbConnectType) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const me = await runEffect(getMeSvc(connect(c.env), c.get("userId")));
    if (!me.isSuperuser) throw new NotFoundError(ADMIN_NOT_FOUND);
    await next();
  });

export const requireSuperuser = createRequireSuperuser((env) =>
  db_connect(env.HYPERDRIVE_REALTIME.connectionString),
);
