import { Effect } from "effect";
import type { FindingList, FindingsQuery, FindingTriage, FindingTriageBody } from "@repo/contracts/elise";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFound, type DbError } from "#/lib/effect-query";
import { findingExistsEffect, listFindingsEffect, partyIdOfUserEffect, upsertTriageEffect } from "#/modules/findings/queries";

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

export const setFindingTriageSvc = (
  db: DbConnectType,
  accountId: string,
  body: FindingTriageBody,
  userId: string | undefined,
): Effect.Effect<FindingTriage, NotFound | DbError> =>
  Effect.gen(function* () {
    const exists = yield* findingExistsEffect(db, accountId, body.repo, body.fingerprint);
    if (!exists) return yield* new NotFound({ message: "Finding not found" });
    const partyId = userId ? yield* partyIdOfUserEffect(db, userId) : null;
    return yield* upsertTriageEffect(db, accountId, body, partyId);
  });
