import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { authUser, tenantRunners, tenants } from "@repo/db-elise";
import { dbConnect } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import type { RunnerNames, RunnerNoticeEmail } from "#/modules/email/types";

export const loadRunnerNames = (databaseUrl: string, mail: RunnerNoticeEmail): Effect.Effect<RunnerNames | undefined, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const db = dbConnect(databaseUrl);
      const [[runner], [actor], [account]] = await Promise.all([
        db.select({ name: tenantRunners.name }).from(tenantRunners).where(and(eq(tenantRunners.id, mail.runnerId), eq(tenantRunners.tenantId, mail.accountId))),
        db.select({ name: authUser.name }).from(authUser).where(eq(authUser.id, mail.actorUserId)),
        db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, mail.accountId)),
      ]);
      return runner && actor && account ? { runnerName: runner.name, actorName: actor.name, accountName: account.name } : undefined;
    },
    catch: toDbError,
  });
