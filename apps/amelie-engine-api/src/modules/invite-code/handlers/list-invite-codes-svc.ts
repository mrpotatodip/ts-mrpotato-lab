import type { Effect } from "effect";
import type { InviteCode } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError } from "#/lib/effect-query";
import { listInviteCodesEffect } from "#/modules/invite-code/queries";

export const listInviteCodesSvc = (db: DbConnectType): Effect.Effect<InviteCode[], DbError> =>
  listInviteCodesEffect(db);
