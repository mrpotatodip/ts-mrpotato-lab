import type { Effect } from "effect";
import type { SettingsChange } from "@repo/contracts/elise";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError } from "#/lib/effect-query";
import { settingsChangesEffect } from "#/modules/usage/queries";

export const getSettingsChangesSvc = (db: DbConnectType, accountId: string): Effect.Effect<SettingsChange[], DbError> => settingsChangesEffect(db, accountId);
