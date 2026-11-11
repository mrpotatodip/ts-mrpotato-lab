import { and, asc, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { Effect } from "effect";
import type { Finding, FindingsQuery, FindingTriage, FindingTriageBody } from "@repo/contracts/elise";
import { partyPersons, scanFindings, scanFindingTriage, scanRepos, scans, type TFindingTriage } from "@repo/db-elise/schema";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import { Forbidden, Invalid, toDbError, type DbError } from "#/lib/effect-query";
import { actorPartyOf, insertAuditEntry } from "#/modules/audit-trail";
import { canonicalRepo } from "#/modules/scan-ledger";

// -----
// Worst first; a finding that still needs
// validation has no severity and goes last.
// -----
const severityRank = sql`case ${scanFindings.severity}
  when 'critical' then 0 when 'high' then 1 when 'medium' then 2 when 'low' then 3 when 'informational' then 4 else 5 end`;

// -----
// Without a scanId, a repo's findings are those of
// its newest successful scan of the default branch, so an old scan's
// findings never mix with a newer one's.
// -----
const latestScanIds = (tenantId: string) =>
  sql`(select distinct on (repo_id) id from scans where tenant_id = ${tenantId} and status = 'succeeded' and ref is null order by repo_id, created_at desc)`;

export type DecidedBy = { firstName: string; lastName: string } | null;

export const decidedByName = (person: DecidedBy | undefined): string | null => (person ? `${person.firstName} ${person.lastName}`.trim() : null);

export const triageView = (triage: TFindingTriage, decidedBy: DecidedBy | undefined = null): FindingTriage => ({
  status: triage.status,
  note: triage.note,
  acceptedUntil: triage.acceptedUntil?.toISOString() ?? null,
  updatedAt: triage.updatedAt.toISOString(),
  decidedBy: decidedByName(decidedBy),
});

const triageFilter = (triage: FindingsQuery["triage"]): SQL | undefined => {
  if (!triage) return undefined;
  if (triage === "open") return or(isNull(scanFindingTriage.status), eq(scanFindingTriage.status, "open"));
  return eq(scanFindingTriage.status, triage);
};

export const listFindingsEffect = (db: DbConnectType, tenantId: string, query: FindingsQuery): Effect.Effect<Finding[], DbError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select({ finding: scanFindings, repo: scans.repo, triage: scanFindingTriage, person: partyPersons })
        .from(scanFindings)
        .innerJoin(scans, eq(scans.id, scanFindings.scanId))
        .leftJoin(
          scanFindingTriage,
          and(
            eq(scanFindingTriage.tenantId, scanFindings.tenantId),
            eq(scanFindingTriage.repoId, scans.repoId),
            eq(scanFindingTriage.fingerprint, scanFindings.fingerprint),
          ),
        )
        .leftJoin(partyPersons, eq(partyPersons.partyId, scanFindingTriage.setByPartyId))
        .where(
          and(
            eq(scanFindings.tenantId, tenantId),
            query.scanId ? eq(scanFindings.scanId, query.scanId) : inArray(scanFindings.scanId, latestScanIds(tenantId)),
            query.repo
              ? inArray(
                  scans.repoId,
                  db.select({ id: scanRepos.id }).from(scanRepos).where(and(eq(scanRepos.tenantId, tenantId), eq(scanRepos.canonical, canonicalRepo(query.repo)))),
                )
              : undefined,
            query.severity ? eq(scanFindings.severity, query.severity) : undefined,
            query.status ? eq(scanFindings.status, query.status) : undefined,
            triageFilter(query.triage),
          ),
        )
        .orderBy(asc(severityRank), desc(scanFindings.createdAt), asc(scanFindings.findingId))
        .limit(query.limit + 1)
        .offset(query.cursor ? Number(query.cursor) : 0);
      return rows.map(({ finding, repo, triage, person }) => ({
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
        triage: triage ? triageView(triage, person) : null,
      }));
    },
    catch: toDbError,
  });

// -----
// The repo a fingerprint belongs to, or null when the
// account has no such problem in that repo. The repo may
// be given in any spelling.
// -----
export const findingRepoIdEffect = (db: DbConnectType, tenantId: string, repoUrl: string, fingerprint: string): Effect.Effect<string | null, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ repoId: scans.repoId })
        .from(scanFindings)
        .innerJoin(scans, eq(scans.id, scanFindings.scanId))
        .innerJoin(scanRepos, eq(scanRepos.id, scans.repoId))
        .where(and(eq(scanFindings.tenantId, tenantId), eq(scanRepos.canonical, canonicalRepo(repoUrl)), eq(scanFindings.fingerprint, fingerprint)))
        .limit(1),
    catch: toDbError,
  }).pipe(Effect.map((rows) => rows[0]?.repoId ?? null));

const DAY_MS = 86_400_000;

// -----
// Every triage decision, in one transaction with its audit row,
// so a decision is never saved without its record. The row names
// the previous decision too. userId is null for the service
// token, which names no one; an accepted risk refuses it, and
// needs a reason and acceptDays.
// -----
export const setTriageEffect = (
  db: PoolDbType,
  tenantId: string,
  repoId: string,
  body: FindingTriageBody,
  userId: string | undefined,
  now: Date,
): Effect.Effect<FindingTriage, Forbidden | Invalid | DbError> =>
  Effect.gen(function* () {
    const accepting = body.status === "accepted_risk";
    const note = body.note?.trim() ? body.note : null;
    if (accepting && (body.acceptDays === undefined || !note)) return yield* new Invalid({ message: "An accepted risk needs a reason and a number of days" });
    const actorPartyId = userId ? yield* Effect.tryPromise({ try: () => actorPartyOf(db, userId), catch: toDbError }) : null;
    if (accepting && !actorPartyId) return yield* new Forbidden({ message: "Forbidden" });
    const acceptedUntil = accepting && body.acceptDays !== undefined ? new Date(now.getTime() + body.acceptDays * DAY_MS) : null;
    return yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const key = and(eq(scanFindingTriage.tenantId, tenantId), eq(scanFindingTriage.repoId, repoId), eq(scanFindingTriage.fingerprint, body.fingerprint));
          const [previous] = await tx.select().from(scanFindingTriage).where(key);
          const [row] = await tx
            .insert(scanFindingTriage)
            .values({ tenantId, repoId, fingerprint: body.fingerprint, status: body.status, note, acceptedUntil, setByPartyId: actorPartyId })
            .onConflictDoUpdate({
              target: [scanFindingTriage.tenantId, scanFindingTriage.repoId, scanFindingTriage.fingerprint],
              set: { status: body.status, note, acceptedUntil, setByPartyId: actorPartyId, updatedAt: now },
            })
            .returning();
          await insertAuditEntry(tx, {
            actorPartyId,
            action: accepting ? "finding.risk.accepted" : "finding.triage.set",
            subjectId: row.id,
            tenantId,
            before: previous ? { status: previous.status, note: previous.note, acceptedUntil: previous.acceptedUntil?.toISOString() ?? null } : undefined,
            after: { fingerprint: body.fingerprint, status: body.status, note, acceptedUntil: acceptedUntil?.toISOString() ?? null },
          });
          const [person] = actorPartyId ? await tx.select().from(partyPersons).where(eq(partyPersons.partyId, actorPartyId)) : [];
          return triageView(row, person);
        }),
      catch: toDbError,
    });
  });
