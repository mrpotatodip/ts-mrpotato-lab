import { eq } from "drizzle-orm";
import { Effect } from "effect";
import type { AccessPower } from "@repo/contracts/elise";
import { authUser, tenants } from "@repo/db-elise/schema";
import type { AppDbType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import { listLoginsWithPowerEffect } from "#/modules/me/queries";

export type NoticeAudience = { accountName: string; actorName: string; recipients: string[] };

export const noticeAudienceEffect = (db: AppDbType, accountId: string, actorUserId: string, power: AccessPower): Effect.Effect<NoticeAudience, DbError> =>
  Effect.gen(function* () {
    const [tenant] = yield* Effect.tryPromise({
      try: () => db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, accountId)),
      catch: toDbError,
    });
    const [actor] = yield* Effect.tryPromise({
      try: () => db.select({ name: authUser.name }).from(authUser).where(eq(authUser.id, actorUserId)),
      catch: toDbError,
    });
    const logins = yield* listLoginsWithPowerEffect(db, accountId, power);
    return { accountName: tenant?.name ?? "your account", actorName: actor?.name ?? "A teammate", recipients: logins.map((login) => login.email) };
  });
