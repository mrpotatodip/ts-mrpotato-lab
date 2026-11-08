import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { Effect } from "effect";
import type { FindingTriageStatusValue, ScanStateValue } from "@repo/contracts/elise";
import { scanFindings, scanFindingTriage, scanRepoFindings, scans } from "@repo/db-elise/schema";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import type { HistoryRow, PriorFinding } from "#/modules/scan-records/types";

// -----
// The repo a scan belongs to, the branch it read and the state
// it is in now, from the scans row made when it was queued.
// -----
export type ScanRowOf = { repoId: string; status: ScanStateValue; branch: string | null; ref: string | null };

export const scanRowOfEffect = (db: DbConnectType, tenantId: string, scanId: string): Effect.Effect<ScanRowOf, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const [row] = await db.select({ repoId: scans.repoId, status: scans.status, branch: scans.branch, ref: scans.ref }).from(scans).where(and(eq(scans.tenantId, tenantId), eq(scans.id, scanId)));
      if (!row) throw new Error(`scan ${scanId} has no row to take its repo from`);
      return row;
    },
    catch: toDbError,
  });

export type RepoHistory = { history: Map<string, HistoryRow>; triage: Map<string, FindingTriageStatusValue> };

// -----
// Everything known about a branch's problems, and what
// people decided about them (a decision is the repo's).
// -----
export const readHistoryEffect = (db: DbConnectType, tenantId: string, repoId: string, branchId: string): Effect.Effect<RepoHistory, DbError> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () => db.select().from(scanRepoFindings).where(and(eq(scanRepoFindings.tenantId, tenantId), eq(scanRepoFindings.branchId, branchId))),
      catch: toDbError,
    });
    const decisions = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ fingerprint: scanFindingTriage.fingerprint, status: scanFindingTriage.status })
          .from(scanFindingTriage)
          .where(and(eq(scanFindingTriage.tenantId, tenantId), eq(scanFindingTriage.repoId, repoId))),
      catch: toDbError,
    });
    return {
      history: new Map(rows.map((row) => [row.fingerprint, row])),
      triage: new Map(decisions.map((row) => [row.fingerprint, row.status])),
    };
  });

const severityRank = sql`case ${scanFindings.severity}
  when 'critical' then 0 when 'high' then 1 when 'medium' then 2 when 'low' then 3 when 'informational' then 4 else 5 end`;

// -----
// The unresolved problems of a repo, worst first, up to
// the cap: still open or regressed, and not marked fixed,
// false positive or accepted by a person. The words come
// from the scan that last saw each one.
// -----
export const listPriorsEffect = (db: DbConnectType, tenantId: string, branchId: string, limit: number): Effect.Effect<PriorFinding[], DbError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db
        .selectDistinctOn([scanRepoFindings.fingerprint], {
          fingerprint: scanRepoFindings.fingerprint,
          status: scanFindings.status,
          severity: scanFindings.severity,
          title: scanFindings.title,
          class: scanFindings.class,
          file: scanFindings.file,
          line: scanFindings.line,
        })
        .from(scanRepoFindings)
        .innerJoin(scanFindings, and(eq(scanFindings.scanId, scanRepoFindings.lastSeenScanId), eq(scanFindings.fingerprint, scanRepoFindings.fingerprint)))
        .leftJoin(
          scanFindingTriage,
          and(
            eq(scanFindingTriage.tenantId, scanRepoFindings.tenantId),
            eq(scanFindingTriage.repoId, scanRepoFindings.repoId),
            eq(scanFindingTriage.fingerprint, scanRepoFindings.fingerprint),
          ),
        )
        .where(
          and(
            eq(scanRepoFindings.tenantId, tenantId),
            eq(scanRepoFindings.branchId, branchId),
            inArray(scanRepoFindings.state, ["open", "regressed"]),
            or(isNull(scanFindingTriage.status), eq(scanFindingTriage.status, "open")),
          ),
        )
        .orderBy(scanRepoFindings.fingerprint, severityRank, desc(scanFindings.createdAt));
      return rows
        .map((row) => ({ priorId: row.fingerprint, status: row.status, severity: row.severity, title: row.title, class: row.class, file: row.file, line: row.line }))
        .toSorted((a, b) => rankOf(a.severity) - rankOf(b.severity) || a.priorId.localeCompare(b.priorId))
        .slice(0, limit);
    },
    catch: toDbError,
  });

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "informational"] as const;
const rankOf = (severity: PriorFinding["severity"]): number => (severity === null ? SEVERITY_ORDER.length : SEVERITY_ORDER.indexOf(severity));
