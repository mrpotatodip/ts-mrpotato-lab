import { Effect } from "effect";
import type { FindingList, FindingsQuery, FindingTriage, FindingTriageBody } from "@repo/contracts/elise";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import { Forbidden, Invalid, NotFound, type DbError } from "#/lib/effect-query";
import { findingRepoIdEffect, listFindingsEffect, setTriageEffect } from "#/modules/findings/queries";

// -----
// One more row than asked tells whether another
// page exists; the cursor is the next offset.
// -----
export const listFindingsSvc = (db: DbConnectType, accountId: string, query: FindingsQuery): Effect.Effect<FindingList, DbError> =>
  Effect.gen(function* () {
    const rows = yield* listFindingsEffect(db, accountId, query);
    const hasMore = rows.length > query.limit;
    const offset = query.cursor ? Number(query.cursor) : 0;
    return { findings: rows.slice(0, query.limit), nextCursor: hasMore ? String(offset + query.limit) : null };
  });

// -----
// Any triage decision, audited. userId is the signed-in login,
// or undefined for the service token. For an accepted risk the
// caller has already proved userId is an admin of the account.
// -----
export const setFindingTriageSvc = (
  db: DbConnectType,
  pool: PoolDbType,
  accountId: string,
  body: FindingTriageBody,
  userId: string | undefined,
): Effect.Effect<FindingTriage, NotFound | Forbidden | Invalid | DbError> =>
  Effect.gen(function* () {
    const repoId = yield* findingRepoIdEffect(db, accountId, body.repo, body.fingerprint);
    if (!repoId) return yield* new NotFound({ message: "Finding not found" });
    return yield* setTriageEffect(pool, accountId, repoId, body, userId, new Date());
  });
