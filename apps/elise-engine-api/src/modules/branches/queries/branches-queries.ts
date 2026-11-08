import { and, asc, count, eq } from "drizzle-orm";
import { Effect } from "effect";
import { REPO_BRANCH_LIMIT } from "@repo/contracts/elise";
import { scanRepoBranches, scanRepos } from "@repo/db-elise/schema";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import { Conflict, NotFound, toDbError, type DbError } from "#/lib/effect-query";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "#/lib/pg-error";

export const BRANCH_LIMIT_MESSAGE = `A repo can track at most ${REPO_BRANCH_LIMIT} branches`;

const limitMessageFor = (tracked: Iterable<string>): string => `${BRANCH_LIMIT_MESSAGE}; it tracks ${[...tracked].toSorted().join(", ") || "none"}`;

export type BranchRef = { id: string; name: string };

export const findBranchEffect = (db: DbConnectType, tenantId: string, repoId: string, name: string): Effect.Effect<BranchRef | null, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ id: scanRepoBranches.id, name: scanRepoBranches.name })
        .from(scanRepoBranches)
        .where(and(eq(scanRepoBranches.tenantId, tenantId), eq(scanRepoBranches.repoId, repoId), eq(scanRepoBranches.name, name))),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows[0] ?? null));

export const listBranchesEffect = (db: DbConnectType, tenantId: string, repoId: string): Effect.Effect<BranchRef[], DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ id: scanRepoBranches.id, name: scanRepoBranches.name })
        .from(scanRepoBranches)
        .where(and(eq(scanRepoBranches.tenantId, tenantId), eq(scanRepoBranches.repoId, repoId)))
        .orderBy(asc(scanRepoBranches.createdAt), asc(scanRepoBranches.name)),
    catch: toDbError,
  });

export type ScanBranchOutcome = { id: string | null; reason: string | null };

// -----
// The branch a finished scan belongs to, or no branch and the
// reason. The clone reported the name it read as a branch (git's
// own answer for a plain clone, or the ref when it was fetched as
// a branch), or no name for a tag, a commit or a detached HEAD.
// A scan that read a real branch tracks it when the repo has a free
// slot: a name is only tracked after a scan of it worked, so a typo
// or a tag cannot use a slot. A scan with no ref also moves the
// repo's default pointer to the name git reported.
// -----
export const resolveScanBranchEffect = (
  db: DbConnectType,
  tenantId: string,
  repoId: string,
  scan: { name: string | null; ref: string | null },
): Effect.Effect<ScanBranchOutcome, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const { name, ref } = scan;
      if (!name) {
        return { id: null, reason: ref ? `"${ref}" is a tag or a commit, not a branch, so this scan has no History` : "the clone was not on a branch, so this scan has no History" };
      }
      const [repo] = await db
        .select({ defaultBranch: scanRepos.defaultBranch })
        .from(scanRepos)
        .where(and(eq(scanRepos.tenantId, tenantId), eq(scanRepos.id, repoId)));
      if (!repo) return { id: null, reason: null };
      if (ref === null && repo.defaultBranch !== name) {
        await db.update(scanRepos).set({ defaultBranch: name }).where(and(eq(scanRepos.tenantId, tenantId), eq(scanRepos.id, repoId)));
      }
      const [existing] = await db
        .select({ id: scanRepoBranches.id })
        .from(scanRepoBranches)
        .where(and(eq(scanRepoBranches.repoId, repoId), eq(scanRepoBranches.name, name)));
      if (existing) return { id: existing.id, reason: null };

      const [{ total }] = await db.select({ total: count() }).from(scanRepoBranches).where(eq(scanRepoBranches.repoId, repoId));
      if (total >= REPO_BRANCH_LIMIT) return { id: null, reason: `the repo already tracks ${REPO_BRANCH_LIMIT} branches, so this scan has no History` };
      const [created] = await db.insert(scanRepoBranches).values({ tenantId, repoId, name }).onConflictDoNothing().returning({ id: scanRepoBranches.id });
      if (created) return { id: created.id, reason: null };
      const [raced] = await db
        .select({ id: scanRepoBranches.id })
        .from(scanRepoBranches)
        .where(and(eq(scanRepoBranches.repoId, repoId), eq(scanRepoBranches.name, name)));
      return { id: raced?.id ?? null, reason: null };
    },
    catch: toDbError,
  });

type PoolTransaction = Parameters<Parameters<PoolDbType["transaction"]>[0]>[0];

// -----
// Track these branches of a repo, inside a transaction. A name
// already tracked is left as it is. The repo row is locked while
// the rows are counted, so two requests cannot both pass the limit.
// Throws NotFound or Conflict to roll the transaction back.
// -----
export const addBranchesTx = async (tx: PoolTransaction, tenantId: string, repoId: string, names: string[]): Promise<BranchRef[]> => {
  const [repo] = await tx
    .select({ id: scanRepos.id })
    .from(scanRepos)
    .where(and(eq(scanRepos.tenantId, tenantId), eq(scanRepos.id, repoId)))
    .for("update");
  if (!repo) throw new NotFound({ message: "Repo not found" });
  const have = await tx.select({ name: scanRepoBranches.name }).from(scanRepoBranches).where(eq(scanRepoBranches.repoId, repoId));
  const known = new Set(have.map((row) => row.name));
  const fresh = [...new Set(names)].filter((name) => !known.has(name));
  if (known.size + fresh.length > REPO_BRANCH_LIMIT) throw new Conflict({ message: limitMessageFor(known) });
  if (fresh.length > 0) await tx.insert(scanRepoBranches).values(fresh.map((name) => ({ tenantId, repoId, name })));
  return tx
    .select({ id: scanRepoBranches.id, name: scanRepoBranches.name })
    .from(scanRepoBranches)
    .where(eq(scanRepoBranches.repoId, repoId))
    .orderBy(asc(scanRepoBranches.createdAt), asc(scanRepoBranches.name));
};

// -----
// What a failed transaction means to the caller: the two
// domain refusals as they are, a lost race on the unique name
// as the limit, anything else as a database error.
// -----
export const classifyBranchFailure = (cause: unknown): Conflict | NotFound | DbError =>
  cause instanceof NotFound || cause instanceof Conflict
    ? cause
    : pgErrorCode(cause) === PG_UNIQUE_VIOLATION
      ? new Conflict({ message: BRANCH_LIMIT_MESSAGE })
      : toDbError(cause);

export const addBranchesEffect = (db: PoolDbType, tenantId: string, repoId: string, names: string[]): Effect.Effect<BranchRef[], Conflict | NotFound | DbError> =>
  Effect.tryPromise({
    try: () => db.transaction((tx) => addBranchesTx(tx, tenantId, repoId, names)),
    catch: classifyBranchFailure,
  });
