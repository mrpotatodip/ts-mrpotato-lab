import type { Effect } from "effect";
import type { Me } from "@repo/contracts/elise";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NotFound } from "#/lib/effect-query";
import { getMeEffect } from "#/modules/me/queries";

export const getMeSvc = (db: DbConnectType, userId: string): Effect.Effect<Me, DbError | NotFound> => getMeEffect(db, userId);
