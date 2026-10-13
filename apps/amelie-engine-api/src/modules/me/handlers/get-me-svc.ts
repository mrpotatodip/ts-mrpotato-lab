import { Effect } from "effect";
import type { Me } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError } from "#/lib/effect-query";
import { isSuperuserEffect } from "#/modules/me/queries";

export const getMeSvc = (db: DbConnectType, userId: string): Effect.Effect<Me, DbError> =>
  isSuperuserEffect(db, userId).pipe(Effect.map((isSuperuser) => ({ isSuperuser })));
