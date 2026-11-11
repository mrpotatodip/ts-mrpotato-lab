import { Effect } from "effect";
import {
  RUNNER_PAIRING_CODE_TTL_MS,
  type CreatedRunner,
  type CreateRunnerBody,
  type EnrolledRunner,
  type EnrollRunnerBody,
  type RunnerIdentity,
  type Runners,
} from "@repo/contracts/elise";
import type { DbConnectType } from "#/lib/db-connection";
import { Forbidden, NotFound, type DbError } from "#/lib/effect-query";
import { RUNNER_NOT_FOUND, RUNNER_PAIRING_INVALID } from "#/modules/runners/constants";
import { claimPairingEffect, createRunnerEffect, findRunnerByTokenEffect, listRunnersEffect, removeRunnerEffect, revokeRunnerByTokenEffect } from "#/modules/runners/queries";
import { generatePairingCode, generateRunnerToken, hashPairingCode, hashRunnerToken } from "#/modules/runners/utils";

// -----
// The code is made here and returned once. Only its
// hash reaches the database.
// -----
export const createRunnerSvc = (db: DbConnectType, accountId: string, userId: string, body: CreateRunnerBody): Effect.Effect<CreatedRunner, Forbidden | DbError> =>
  Effect.gen(function* () {
    const pairingCode = generatePairingCode();
    const codeHash = yield* Effect.promise(() => hashPairingCode(pairingCode));
    const created = yield* createRunnerEffect(db, {
      tenantId: accountId,
      actorUserId: userId,
      name: body.name,
      codeHash,
      expiresAt: new Date(Date.now() + RUNNER_PAIRING_CODE_TTL_MS),
    });
    return { ...created, pairingCode };
  });

// -----
// The token is made here and returned once. A code that
// does not match gets the same answer whatever the reason.
// -----
export const enrollRunnerSvc = (db: DbConnectType, body: EnrollRunnerBody): Effect.Effect<EnrolledRunner, Forbidden | DbError> =>
  Effect.gen(function* () {
    const token = generateRunnerToken();
    const [codeHash, tokenHash] = yield* Effect.promise(() => Promise.all([hashPairingCode(body.code), hashRunnerToken(token)]));
    const identity = yield* claimPairingEffect(db, { codeHash, tokenHash, now: new Date() });
    if (!identity) return yield* Effect.fail(new Forbidden({ message: RUNNER_PAIRING_INVALID }));
    return { ...identity, token };
  });

export const listRunnersSvc = (db: DbConnectType, accountId: string): Effect.Effect<Runners, DbError> => listRunnersEffect(db, accountId, new Date());

export const removeRunnerSvc = (db: DbConnectType, accountId: string, runnerId: string): Effect.Effect<{ removed: true }, NotFound | DbError> =>
  removeRunnerEffect(db, accountId, runnerId, new Date()).pipe(
    Effect.flatMap((removed) => (removed ? Effect.succeed({ removed: true as const }) : Effect.fail(new NotFound({ message: RUNNER_NOT_FOUND })))),
  );

export const disconnectRunnerSvc =(db: DbConnectType, token: string): Effect.Effect<boolean, DbError> =>
  Effect.gen(function* () {
    const tokenHash = yield* Effect.promise(() => hashRunnerToken(token));
    return yield* revokeRunnerByTokenEffect(db, tokenHash, new Date());
  });

export const runnerIdentitySvc =(db: DbConnectType, token: string): Effect.Effect<RunnerIdentity | null, DbError> =>
  Effect.gen(function* () {
    const tokenHash = yield* Effect.promise(() => hashRunnerToken(token));
    return yield* findRunnerByTokenEffect(db, tokenHash, new Date());
  });
