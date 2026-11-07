import { and, asc, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { Effect } from "effect";
import type { Finding, FindingsQuery, FindingTriageBody } from "@repo/contracts/elise";
import { authUser, scanFindings, scanFindingTriage, scans } from "@repo/db-elise/schema";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";

// -----
// Worst first; a finding that still needs
// validation has no severity and goes last.
// -----
const severityRank = sql`case ${scanFindings.severity}
  when 'critical' then 0 when 'high' then 1 when 'medium' then 2 when 'low' then 3 when 'informational' then 4 else 5 end`;

// -----
// Without a scanId, a repo's findings are those of
// its newest successful scan, so an old scan's
// findings never mix with a newer one's.
// -----
const latestScanIds = (tenantId: string) =>
  sql`(select distinct on (repo) id from scans where tenant_id = ${tenantId} and status = 'succeeded' order by repo, created_at desc)`;

const triageFilter = (triage: FindingsQuery["triage"]): SQL | undefined => {
  if (!triage) return undefined;
  if (triage === "open") return or(isNull(scanFindingTriage.status), eq(scanFindingTriage.status, "open"));
  return eq(scanFindingTriage.status, triage);
};

export const listFindingsEffect = (db: DbConnectType, tenantId: string, query: FindingsQuery): Effect.Effect<Finding[], DbError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select({ finding: scanFindings, repo: scans.repo, triage: scanFindingTriage })
        .from(scanFindings)
        .innerJoin(scans, eq(scans.id, scanFindings.scanId))
        .leftJoin(
          scanFindingTriage,
          and(
            eq(scanFindingTriage.tenantId, scanFindings.tenantId),
            eq(scanFindingTriage.repo, scans.repo),
            eq(scanFindingTriage.fingerprint, scanFindings.fingerprint),
          ),
        )
        .where(
          and(
            eq(scanFindings.tenantId, tenantId),
            query.scanId ? eq(scanFindings.scanId, query.scanId) : inArray(scanFindings.scanId, latestScanIds(tenantId)),
            query.repo ? eq(scans.repo, query.repo) : undefined,
            query.severity ? eq(scanFindings.severity, query.severity) : undefined,
            query.status ? eq(scanFindings.status, query.status) : undefined,
            triageFilter(query.triage),
          ),
        )
        .orderBy(asc(severityRank), desc(scanFindings.createdAt), asc(scanFindings.findingId))
        .limit(query.limit + 1)
        .offset(query.cursor ? Number(query.cursor) : 0);
      return rows.map(({ finding, repo, triage }) => ({
        id: finding.id,
        scanId: finding.scanId,
        repo,
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
        triage: triage ? { status: triage.status, note: triage.note, updatedAt: triage.updatedAt.toISOString() } : null,
      }));
    },
    catch: toDbError,
  });

export const findingExistsEffect = (db: DbConnectType, tenantId: string, repo: string, fingerprint: string): Effect.Effect<boolean, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ id: scanFindings.id })
        .from(scanFindings)
        .innerJoin(scans, eq(scans.id, scanFindings.scanId))
        .where(and(eq(scanFindings.tenantId, tenantId), eq(scans.repo, repo), eq(scanFindings.fingerprint, fingerprint)))
        .limit(1),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows.length > 0));

export const partyIdOfUserEffect = (db: DbConnectType, userId: string): Effect.Effect<string | null, DbError> =>
  Effect.tryPromise({
    try: () => db.select({ partyId: authUser.partyId }).from(authUser).where(eq(authUser.id, userId)),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows[0]?.partyId ?? null));

export const upsertTriageEffect = (
  db: DbConnectType,
  tenantId: string,
  body: FindingTriageBody,
  setByPartyId: string | null,
): Effect.Effect<{ status: FindingTriageBody["status"]; note: string | null; updatedAt: string }, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const [row] = await db
        .insert(scanFindingTriage)
        .values({ tenantId, repo: body.repo, fingerprint: body.fingerprint, status: body.status, note: body.note ?? null, setByPartyId })
        .onConflictDoUpdate({
          target: [scanFindingTriage.tenantId, scanFindingTriage.repo, scanFindingTriage.fingerprint],
          set: { status: body.status, note: body.note ?? null, setByPartyId, updatedAt: new Date() },
        })
        .returning();
      return { status: row.status, note: row.note, updatedAt: row.updatedAt.toISOString() };
    },
    catch: toDbError,
  });
