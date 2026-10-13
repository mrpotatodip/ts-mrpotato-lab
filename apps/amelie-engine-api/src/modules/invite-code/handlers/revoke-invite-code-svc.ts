import { Effect } from "effect";
import type { InviteCode } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NotFound } from "#/lib/effect-query";
import { getInviteCodeEffect, revokeInviteCodeEffect } from "#/modules/invite-code/queries";

// -----
// The row stays as history. An unknown id is
// checked first, so it answers 404, not 200.
// -----
export const revokeInviteCodeSvc = (
  db: DbConnectType,
  id: string,
): Effect.Effect<InviteCode, DbError | NotFound> =>
  Effect.gen(function* () {
    yield* getInviteCodeEffect(db, id);
    yield* revokeInviteCodeEffect(db, id, new Date());
    return yield* getInviteCodeEffect(db, id);
  });
