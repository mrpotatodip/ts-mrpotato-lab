import { Effect } from "effect";
import type { AnthropicKey } from "@repo/contracts/elise";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import { Forbidden, Invalid, toExternalError, type DbError, type ExternalError } from "#/lib/effect-query";
import { ANTHROPIC_KEY_NOT_SET_UP, ANTHROPIC_KEY_REFUSED } from "#/modules/anthropic-key/constants";
import { findAnthropicKeyEffect, removeAnthropicKeyEffect, saveAnthropicKeyEffect } from "#/modules/anthropic-key/queries";
import { sealKey } from "#/modules/anthropic-key/utils";

export const getAnthropicKeySvc = (db: DbConnectType, accountId: string): Effect.Effect<AnthropicKey, DbError> => findAnthropicKeyEffect(db, accountId);

// -----
// The key is tried against Anthropic before it is saved, so a typo
// fails here and not in the middle of a scan. An Anthropic outage is
// an external error: it says nothing about the key. Only the sealed
// text and the last four characters are stored.
// -----
export const setAnthropicKeySvc = (
  secret: string | undefined,
  db: PoolDbType,
  check: (apiKey: string) => Promise<boolean>,
  accountId: string,
  userId: string,
  apiKey: string,
): Effect.Effect<AnthropicKey, Invalid | Forbidden | ExternalError | DbError> =>
  Effect.gen(function* () {
    if (secret === undefined) return yield* new Invalid({ message: ANTHROPIC_KEY_NOT_SET_UP });
    const accepted = yield* Effect.tryPromise({ try: () => check(apiKey), catch: toExternalError });
    if (!accepted) return yield* new Invalid({ message: ANTHROPIC_KEY_REFUSED });
    const sealed = yield* Effect.promise(() => sealKey(secret, accountId, apiKey));
    return yield* saveAnthropicKeyEffect(db, accountId, userId, sealed, apiKey.slice(-4));
  });

export const removeAnthropicKeySvc = (db: PoolDbType, accountId: string, userId: string): Effect.Effect<AnthropicKey, DbError> => removeAnthropicKeyEffect(db, accountId, userId);
