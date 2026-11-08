import { Effect } from "effect";
import { Invalid, NotFound, type Conflict, type DbError } from "#/lib/effect-query";
import type { RepoBranchList, RepoDetail, RepoFindingList, RepoFindingsQuery, RepoList, ScanDiff } from "@repo/contracts/elise";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import type { ScanRepo } from "#/modules/scan-ledger";
import { REPOS_HISTORY_LIMIT } from "#/modules/repos/constants";
import { addBranchesEffect, isCommitId, listBranchesEffect, normalizeBranchName } from "#/modules/branches";
import { addRepoEffect, getRepoEffect, listRepoBranchesEffect, listReposEffect, repoFindingsEffect, scanDiffEffect } from "#/modules/repos/queries";
import type { AddBranchBody, AddRepoBody } from "#/modules/repos/schemas";
import { severityRank } from "#/modules/repos/utils";

export const listReposSvc = (db: DbConnectType, accountId: string): Effect.Effect<RepoList, DbError> =>
  listReposEffect(db, accountId).pipe(Effect.map((repos) => ({ repos })));

// -----
// The repo with its branches and its newest scans, each with
// the commit it read and the counts of what it found.
// -----
export const getRepoSvc = (db: DbConnectType, scanRepo: ScanRepo, accountId: string, repoId: string): Effect.Effect<RepoDetail, NotFound | DbError> =>
  Effect.gen(function* () {
    const repo = yield* getRepoEffect(db, accountId, repoId);
    const page = yield* scanRepo.list(accountId, REPOS_HISTORY_LIMIT, undefined, { repoId });
    const branches = yield* listRepoBranchesEffect(db, accountId, repoId);
    return { ...repo, history: page.scans, branches };
  });

// -----
// One more than asked tells whether another page exists;
// the cursor is the next offset. Worst first, then the
// ones seen longest ago. The branch is the one asked for,
// else the default; a repo with neither has no problems yet.
// -----
export const listRepoFindingsSvc = (db: DbConnectType, accountId: string, repoId: string, query: RepoFindingsQuery): Effect.Effect<RepoFindingList, NotFound | DbError> =>
  Effect.gen(function* () {
    const repo = yield* getRepoEffect(db, accountId, repoId);
    const wantedName = query.branch ?? repo.defaultBranch;
    const branch = wantedName ? (yield* listBranchesEffect(db, accountId, repoId)).find((item) => item.name === wantedName) : undefined;
    if (query.branch && !branch) return yield* new NotFound({ message: "Branch not found" });
    const all = branch ? ((yield* repoFindingsEffect(db, accountId, branch.id)).get(branch.id) ?? []) : [];
    const wanted = all
      .filter((finding) => (query.state ? finding.state === query.state : true))
      .filter((finding) => (query.severity ? finding.severity === query.severity : true))
      .filter((finding) => (query.triage ? (finding.triage?.status ?? "open") === query.triage : true))
      .toSorted((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.firstSeenScanId.localeCompare(b.firstSeenScanId) || a.fingerprint.localeCompare(b.fingerprint));
    const offset = query.cursor ? Number(query.cursor) : 0;
    const end = offset + query.limit;
    return { findings: wanted.slice(offset, end), nextCursor: wanted.length > end ? String(end) : null };
  });

export const scanDiffSvc = (db: DbConnectType, accountId: string, scanId: string): Effect.Effect<ScanDiff, NotFound | Invalid | DbError> =>
  scanDiffEffect(db, accountId, scanId);

const branchNamesOf = (names: string[]): Effect.Effect<string[], Invalid> =>
  Effect.forEach(names, (name) => {
    const normalized = normalizeBranchName(name);
    if (normalized === null) return Effect.fail(new Invalid({ message: `"${name}" is not a branch name` }));
    return isCommitId(normalized) ? Effect.fail(new Invalid({ message: `"${name}" is a commit, not a branch: scan it with ref` })) : Effect.succeed(normalized);
  });

// -----
// Add a repo (and the branches to track) without scanning it.
// Adding a repo that is already there changes nothing but
// adds the branches named.
// -----
export const addRepoSvc = (
  db: DbConnectType,
  pool: PoolDbType,
  scanRepo: ScanRepo,
  accountId: string,
  body: AddRepoBody,
): Effect.Effect<RepoDetail, Invalid | Conflict | NotFound | DbError> =>
  Effect.gen(function* () {
    const names = yield* branchNamesOf(body.branches ?? []);
    const repoId = yield* addRepoEffect(pool, accountId, body.repo, names);
    return yield* getRepoSvc(db, scanRepo, accountId, repoId);
  });

export const addBranchSvc = (
  db: DbConnectType,
  pool: PoolDbType,
  accountId: string,
  repoId: string,
  body: AddBranchBody,
): Effect.Effect<RepoBranchList, Invalid | Conflict | NotFound | DbError> =>
  Effect.gen(function* () {
    const [name] = yield* branchNamesOf([body.name]);
    yield* addBranchesEffect(pool, accountId, repoId, [name]);
    return { branches: yield* listRepoBranchesEffect(db, accountId, repoId) };
  });
