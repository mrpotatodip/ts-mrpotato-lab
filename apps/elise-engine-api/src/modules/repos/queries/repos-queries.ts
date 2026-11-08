import { and, asc, count, desc, eq, inArray, lt, max } from "drizzle-orm";
import { Effect } from "effect";
import { REPO_LIMIT_PER_TENANT, type DiffEntry, type Repo, type RepoBranch, type RepoFinding, type ScanDiff } from "@repo/contracts/elise";
import { partyPersons, scanFindings, scanFindingTriage, scanRepoBranches, scanRepoFindings, scanRepos, scans } from "@repo/db-elise/schema";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import { Conflict, Invalid, NotFound, toDbError, type DbError } from "#/lib/effect-query";
import { addBranchesTx, classifyBranchFailure } from "#/modules/branches";
import { triageView } from "#/modules/findings/queries";
import { canonicalRepo, displayRepoUrl } from "#/modules/scan-ledger";
import { openCountsOf, type OpenCountRow } from "#/modules/repos/utils";

// -----
// Every problem a branch has ever had, with its words from the
// scan that last saw it, the history around it and what a
// person decided. A branch has tens to hundreds, so counts,
// filters and pages are made from this one list. The map is
// keyed by branch.
// -----
export const repoFindingsEffect = (db: DbConnectType, tenantId: string, branchId?: string): Effect.Effect<Map<string, RepoFinding[]>, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db
        .selectDistinctOn([scanRepoFindings.branchId, scanRepoFindings.fingerprint], { finding: scanFindings, history: scanRepoFindings, triage: scanFindingTriage, person: partyPersons, url: scanRepos.url })
        .from(scanRepoFindings)
        .innerJoin(scanRepos, eq(scanRepos.id, scanRepoFindings.repoId))
        .innerJoin(scanFindings, and(eq(scanFindings.scanId, scanRepoFindings.lastSeenScanId), eq(scanFindings.fingerprint, scanRepoFindings.fingerprint)))
        .leftJoin(
          scanFindingTriage,
          and(
            eq(scanFindingTriage.tenantId, scanRepoFindings.tenantId),
            eq(scanFindingTriage.repoId, scanRepoFindings.repoId),
            eq(scanFindingTriage.fingerprint, scanRepoFindings.fingerprint),
          ),
        )
        .leftJoin(partyPersons, eq(partyPersons.partyId, scanFindingTriage.setByPartyId))
        .where(and(eq(scanRepoFindings.tenantId, tenantId), branchId ? eq(scanRepoFindings.branchId, branchId) : undefined))
        .orderBy(scanRepoFindings.branchId, scanRepoFindings.fingerprint);
      const byBranch = new Map<string, RepoFinding[]>();
      for (const { finding, history, triage, person, url } of rows) {
        const entry: RepoFinding = {
          id: finding.id,
          scanId: finding.scanId,
          repo: url,
          findingId: finding.findingId,
          fingerprint: finding.fingerprint,
          status: finding.status,
          severity: finding.severity,
          title: finding.title,
          class: finding.class,
          file: finding.file,
          line: finding.line,
          actor: finding.actor,
          impact: finding.impact,
          evidence: finding.evidence,
          fix: finding.fix,
          needs: finding.needs,
          createdAt: finding.createdAt.toISOString(),
          triage: triage ? triageView(triage, person) : null,
          state: history.state,
          unchecked: history.unchecked,
          firstSeenScanId: history.firstSeenScanId,
          fixedInScanId: history.fixedInScanId,
          possibleDuplicateOf: history.possibleDuplicateOf,
        };
        byBranch.set(history.branchId, [...(byBranch.get(history.branchId) ?? []), entry]);
      }
      return byBranch;
    },
    catch: toDbError,
  });

// -----
// Just what the open counts need for each problem: no
// evidence, impact or fix text. Keyed by branch.
// -----
const repoOpenCountRowsEffect = (db: DbConnectType, tenantId: string, repoId?: string): Effect.Effect<Map<string, OpenCountRow[]>, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select({
          branchId: scanRepoFindings.branchId,
          state: scanRepoFindings.state,
          unchecked: scanRepoFindings.unchecked,
          severity: scanFindings.severity,
          triageStatus: scanFindingTriage.status,
        })
        .from(scanRepoFindings)
        .innerJoin(
          scanFindings,
          and(eq(scanFindings.scanId, scanRepoFindings.lastSeenScanId), eq(scanFindings.fingerprint, scanRepoFindings.fingerprint)),
        )
        .leftJoin(
          scanFindingTriage,
          and(
            eq(scanFindingTriage.tenantId, scanRepoFindings.tenantId),
            eq(scanFindingTriage.repoId, scanRepoFindings.repoId),
            eq(scanFindingTriage.fingerprint, scanRepoFindings.fingerprint),
          ),
        )
        .where(and(eq(scanRepoFindings.tenantId, tenantId), inArray(scanRepoFindings.state, ["open", "regressed"]), repoId ? eq(scanRepoFindings.repoId, repoId) : undefined));
      const byBranch = new Map<string, OpenCountRow[]>();
      for (const row of rows) {
        const entry: OpenCountRow = { state: row.state, unchecked: row.unchecked, severity: row.severity, triage: row.triageStatus ? { status: row.triageStatus } : null };
        byBranch.set(row.branchId, [...(byBranch.get(row.branchId) ?? []), entry]);
      }
      return byBranch;
    },
    catch: toDbError,
  });

// -----
// The account's repos, or one, with how many scans each has,
// its latest scan and what is still open on its default branch.
// -----
export const listReposEffect = (db: DbConnectType, tenantId: string, repoId?: string): Effect.Effect<Repo[], DbError> =>
  Effect.gen(function* () {
    const repos = yield* Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(scanRepos)
          .where(and(eq(scanRepos.tenantId, tenantId), repoId ? eq(scanRepos.id, repoId) : undefined))
          .orderBy(asc(scanRepos.canonical)),
      catch: toDbError,
    });
    const totals = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ repoId: scans.repoId, total: count(), lastAt: max(scans.createdAt) })
          .from(scans)
          .where(and(eq(scans.tenantId, tenantId), repoId ? eq(scans.repoId, repoId) : undefined))
          .groupBy(scans.repoId),
      catch: toDbError,
    });
    const latest = yield* Effect.tryPromise({
      try: () =>
        db
          .selectDistinctOn([scans.repoId], { repoId: scans.repoId, id: scans.id, status: scans.status, createdAt: scans.createdAt })
          .from(scans)
          .where(and(eq(scans.tenantId, tenantId), repoId ? eq(scans.repoId, repoId) : undefined))
          .orderBy(scans.repoId, desc(scans.createdAt), desc(scans.id)),
      catch: toDbError,
    });
    const branches = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ id: scanRepoBranches.id, repoId: scanRepoBranches.repoId, name: scanRepoBranches.name })
          .from(scanRepoBranches)
          .where(and(eq(scanRepoBranches.tenantId, tenantId), repoId ? eq(scanRepoBranches.repoId, repoId) : undefined))
          .orderBy(asc(scanRepoBranches.createdAt), asc(scanRepoBranches.name)),
      catch: toDbError,
    });
    const findings = yield* repoOpenCountRowsEffect(db, tenantId, repoId);
    return repos.map((repo) => {
      const last = latest.find((row) => row.repoId === repo.id);
      const defaultBranchId = branches.find((branch) => branch.repoId === repo.id && branch.name === repo.defaultBranch)?.id;
      return {
        id: repo.id,
        url: repo.url,
        canonical: repo.canonical,
        defaultBranch: repo.defaultBranch,
        branchNames: branches.filter((branch) => branch.repoId === repo.id).map((branch) => branch.name),
        scans: totals.find((row) => row.repoId === repo.id)?.total ?? 0,
        lastScanId: last?.id ?? null,
        lastScanStatus: last?.status ?? null,
        lastScanAt: last?.createdAt.toISOString() ?? null,
        open: openCountsOf((defaultBranchId ? findings.get(defaultBranchId) : undefined) ?? []),
      };
    });
  });

export const getRepoEffect = (db: DbConnectType, tenantId: string, repoId: string): Effect.Effect<Repo, NotFound | DbError> =>
  listReposEffect(db, tenantId, repoId).pipe(
    Effect.flatMap(([repo]) => (repo ? Effect.succeed(repo) : Effect.fail(new NotFound({ message: "Repo not found" })))),
  );

// -----
// A repo's branches, each with what is open on it and the commit
// of its newest succeeded lite scan: the commit to ask a verdict
// about.
// -----
export const listRepoBranchesEffect = (db: DbConnectType, tenantId: string, repoId: string): Effect.Effect<RepoBranch[], DbError> =>
  Effect.gen(function* () {
    const [repo] = yield* Effect.tryPromise({
      try: () => db.select({ defaultBranch: scanRepos.defaultBranch }).from(scanRepos).where(and(eq(scanRepos.tenantId, tenantId), eq(scanRepos.id, repoId))),
      catch: toDbError,
    });
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ id: scanRepoBranches.id, name: scanRepoBranches.name })
          .from(scanRepoBranches)
          .where(and(eq(scanRepoBranches.tenantId, tenantId), eq(scanRepoBranches.repoId, repoId)))
          .orderBy(asc(scanRepoBranches.createdAt), asc(scanRepoBranches.name)),
      catch: toDbError,
    });
    const latest = yield* Effect.tryPromise({
      try: () =>
        db
          .selectDistinctOn([scans.branchId], { branchId: scans.branchId, id: scans.id, commitSha: scans.commitSha, createdAt: scans.createdAt })
          .from(scans)
          .where(and(eq(scans.tenantId, tenantId), eq(scans.repoId, repoId), eq(scans.status, "succeeded"), eq(scans.skill, "lite")))
          .orderBy(scans.branchId, desc(scans.createdAt), desc(scans.id)),
      catch: toDbError,
    });
    const findings = yield* repoOpenCountRowsEffect(db, tenantId, repoId);
    return rows.map((branch) => {
      const last = latest.find((row) => row.branchId === branch.id);
      return {
        id: branch.id,
        name: branch.name,
        isDefault: branch.name === repo?.defaultBranch,
        open: openCountsOf(findings.get(branch.id) ?? []),
        latestScanId: last?.id ?? null,
        latestCommit: last?.commitSha ?? null,
        latestScanAt: last?.createdAt.toISOString() ?? null,
      };
    });
  });

const entryOf = (row: { fingerprint: string; status: DiffEntry["status"]; severity: DiffEntry["severity"]; title: string; class: string; file: string | null; line: number | null }): DiffEntry => ({
  fingerprint: row.fingerprint,
  status: row.status,
  severity: row.severity,
  title: row.title,
  class: row.class,
  file: row.file,
  line: row.line,
});

// -----
// What changed in a scan compared with the previous
// succeeded lite scan of the same branch.
//   stillOpen    in both, or re-checked and still there
//   new          first seen in this scan
//   regressed    seen before, gone, and back
//   fixed        the agent checked and it was gone
//   notRechecked in the previous list, missing from this
//                one with no evidence it was fixed
// -----
export const scanDiffEffect = (db: DbConnectType, tenantId: string, scanId: string): Effect.Effect<ScanDiff, NotFound | Invalid | DbError> =>
  Effect.gen(function* () {
    const [scan] = yield* Effect.tryPromise({
      try: () => db.select().from(scans).where(and(eq(scans.tenantId, tenantId), eq(scans.id, scanId))),
      catch: toDbError,
    });
    if (!scan) return yield* new NotFound({ message: "Scan not found" });
    if (scan.status !== "succeeded" || scan.skill !== "lite") {
      return yield* new Invalid({ message: "Only a succeeded lite scan has recorded findings to compare" });
    }
    const { branchId } = scan;
    if (branchId === null) return yield* new Invalid({ message: "A scan with no tracked branch has no history to compare with" });
    const [previous] = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ id: scans.id })
          .from(scans)
          .where(and(eq(scans.branchId, branchId), eq(scans.status, "succeeded"), eq(scans.skill, "lite"), lt(scans.createdAt, scan.createdAt)))
          .orderBy(desc(scans.createdAt), desc(scans.id))
          .limit(1),
      catch: toDbError,
    });
    const rowsOf = (id: string) =>
      Effect.tryPromise({
        try: () =>
          db
            .selectDistinctOn([scanFindings.fingerprint], {
              fingerprint: scanFindings.fingerprint,
              status: scanFindings.status,
              severity: scanFindings.severity,
              title: scanFindings.title,
              class: scanFindings.class,
              file: scanFindings.file,
              line: scanFindings.line,
              origin: scanFindings.origin,
            })
            .from(scanFindings)
            .where(eq(scanFindings.scanId, id))
            .orderBy(scanFindings.fingerprint),
        catch: toDbError,
      });
    const current = yield* rowsOf(scanId);
    const before = previous ? yield* rowsOf(previous.id) : [];
    const fingerprints = [...new Set([...current, ...before].map((row) => row.fingerprint))];
    const history =
      fingerprints.length === 0
        ? []
        : yield* Effect.tryPromise({
            try: () =>
              db
                .select({ fingerprint: scanRepoFindings.fingerprint, firstSeenScanId: scanRepoFindings.firstSeenScanId, fixedInScanId: scanRepoFindings.fixedInScanId })
                .from(scanRepoFindings)
                .where(and(eq(scanRepoFindings.branchId, branchId), inArray(scanRepoFindings.fingerprint, fingerprints))),
            catch: toDbError,
          });
    const historyOf = new Map(history.map((row) => [row.fingerprint, row]));
    const beforeIds = new Set(before.map((row) => row.fingerprint));
    const currentIds = new Set(current.map((row) => row.fingerprint));

    const diff: ScanDiff = { scanId, previousScanId: previous?.id ?? null, new: [], stillOpen: [], regressed: [], fixed: [], notRechecked: [] };
    for (const row of current) {
      if (row.origin === "carried" || beforeIds.has(row.fingerprint)) diff.stillOpen.push(entryOf(row));
      else if (historyOf.get(row.fingerprint)?.firstSeenScanId === scanId) diff.new.push(entryOf(row));
      else diff.regressed.push(entryOf(row));
    }
    for (const row of before.filter((item) => !currentIds.has(item.fingerprint))) {
      (historyOf.get(row.fingerprint)?.fixedInScanId === scanId ? diff.fixed : diff.notRechecked).push(entryOf(row));
    }
    return diff;
  });


export const REPO_LIMIT_MESSAGE = `An account can have at most ${REPO_LIMIT_PER_TENANT} repos`;

// -----
// Add a repo without scanning it, with the branches to track.
// The same repo in any spelling is the repo already there, so
// adding twice changes nothing. In one transaction: the repo
// (refused past the account's limit), then its branches (refused
// past the repo's limit), so a refusal leaves nothing behind.
// -----
export const addRepoEffect = (db: PoolDbType, tenantId: string, url: string, branches: string[]): Effect.Effect<string, Conflict | NotFound | DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const canonical = canonicalRepo(url);
        const [existing] = await tx
          .select({ id: scanRepos.id })
          .from(scanRepos)
          .where(and(eq(scanRepos.tenantId, tenantId), eq(scanRepos.canonical, canonical)));
        let repoId = existing?.id;
        if (!repoId) {
          const [{ total }] = await tx.select({ total: count() }).from(scanRepos).where(eq(scanRepos.tenantId, tenantId));
          if (total >= REPO_LIMIT_PER_TENANT) throw new Conflict({ message: REPO_LIMIT_MESSAGE });
          const [created] = await tx
            .insert(scanRepos)
            .values({ tenantId, canonical, url: displayRepoUrl(url) })
            .onConflictDoNothing()
            .returning({ id: scanRepos.id });
          repoId = created?.id;
          if (!repoId) {
            const [raced] = await tx.select({ id: scanRepos.id }).from(scanRepos).where(and(eq(scanRepos.tenantId, tenantId), eq(scanRepos.canonical, canonical)));
            repoId = raced.id;
          }
        }
        await addBranchesTx(tx, tenantId, repoId, branches);
        return repoId;
      }),
    catch: classifyBranchFailure,
  });
