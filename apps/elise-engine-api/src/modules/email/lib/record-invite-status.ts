import { withPool } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import type { RecordInviteStatus } from "#/modules/email/types";
import { markInviteEmailStatusEffect } from "#/modules/team/queries";
import type { Bindings } from "#/types/variables";

export const recordInviteStatusOf =
  (env: Pick<Bindings, "DATABASE_URL">, waitUntil: (promise: Promise<unknown>) => void): RecordInviteStatus =>
  (inviteId, status) =>
    withPool(env.DATABASE_URL, waitUntil, (db) => runEffect(markInviteEmailStatusEffect(db, inviteId, status, new Date())));
