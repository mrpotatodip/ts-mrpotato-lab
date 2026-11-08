import { Effect } from "effect";
import type { Verdict } from "@repo/contracts/elise";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NotFound } from "#/lib/effect-query";
import { getRepoEffect } from "#/modules/repos/queries";
import { commitEvidenceEffect } from "#/modules/verdict/queries";
import { judgeCommit } from "#/modules/verdict/utils";

// -----
// Can this commit of this repo ship? 404 when the repo is not
// in the account. Nothing is stored: the answer is computed
// from the scans and decisions on every call, so it cannot
// disagree with them.
// -----
export const verdictSvc = (db: DbConnectType, accountId: string, repoId: string, commit: string, now: Date): Effect.Effect<Verdict, NotFound | DbError> =>
  Effect.gen(function* () {
    yield* getRepoEffect(db, accountId, repoId);
    const evidence = yield* commitEvidenceEffect(db, accountId, repoId, commit);
    return judgeCommit({ commit, ...evidence, now });
  });
