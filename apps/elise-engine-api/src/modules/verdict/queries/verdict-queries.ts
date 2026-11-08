import { and, desc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import { scanFindings, scanFindingTriage, scans } from "@repo/db-elise/schema";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import { VERDICT_SCAN_FETCH_LIMIT } from "#/modules/verdict/constants";
import type { JudgedFinding, JudgedScan, JudgedTriage } from "#/modules/verdict/types";

type CommitEvidence = { scans: JudgedScan[]; findings: JudgedFinding[]; triage: JudgedTriage[] };

// -----
// What the verdict reads: the newest succeeded lite scans of
// one commit of one repo (a scan of a ref counts too, because
// the verdict is about the commit, not the branch), their
// findings, and the decisions people made about the repo.
// -----
export const commitEvidenceEffect = (db: DbConnectType, tenantId: string, repoId: string, commit: string): Effect.Effect<CommitEvidence, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const scanRows = await db
        .select({ id: scans.id, createdAt: scans.createdAt, priorsGiven: scans.priorsGiven, priorsUnchecked: scans.priorsUnchecked })
        .from(scans)
        .where(and(eq(scans.tenantId, tenantId), eq(scans.repoId, repoId), eq(scans.commitSha, commit), eq(scans.status, "succeeded"), eq(scans.skill, "lite")))
        .orderBy(desc(scans.createdAt))
        .limit(VERDICT_SCAN_FETCH_LIMIT);
      if (scanRows.length === 0) return { scans: [], findings: [], triage: [] };

      const findings = await db
        .select({
          scanId: scanFindings.scanId,
          fingerprint: scanFindings.fingerprint,
          title: scanFindings.title,
          severity: scanFindings.severity,
          class: scanFindings.class,
          file: scanFindings.file,
          line: scanFindings.line,
        })
        .from(scanFindings)
        .where(
          and(
            eq(scanFindings.tenantId, tenantId),
            inArray(
              scanFindings.scanId,
              scanRows.map((row) => row.id),
            ),
          ),
        );
      const triage = await db
        .select({ fingerprint: scanFindingTriage.fingerprint, status: scanFindingTriage.status, note: scanFindingTriage.note, acceptedUntil: scanFindingTriage.acceptedUntil })
        .from(scanFindingTriage)
        .where(and(eq(scanFindingTriage.tenantId, tenantId), eq(scanFindingTriage.repoId, repoId)));
      return { scans: scanRows, findings, triage };
    },
    catch: toDbError,
  });
