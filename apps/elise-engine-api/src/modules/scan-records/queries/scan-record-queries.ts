import { eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import { scanFindings, scanRepoFindings, scans } from "@repo/db-elise/schema";
import { toDbError, type DbError } from "#/lib/effect-query";
import type { DbConnectType } from "#/lib/db-connection";
import type { ScanRecord } from "#/modules/scan-records/types";

export const writeScanRecordEffect = (db: DbConnectType, record: ScanRecord): Effect.Effect<void, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const { scan, findings: rows, history } = record;
      const upsert = db
        .insert(scans)
        .values(scan)
        .onConflictDoUpdate({
          target: scans.id,
          set: {
            status: scan.status,
            error: scan.error,
            branch: scan.branch,
            branchId: scan.branchId,
            untrackedReason: scan.untrackedReason,
            finishedAt: scan.finishedAt,
            priorsGiven: scan.priorsGiven,
            priorsCarried: scan.priorsCarried,
            priorsClosed: scan.priorsClosed,
            priorsUnchecked: scan.priorsUnchecked,
            inputTokens: scan.inputTokens,
            outputTokens: scan.outputTokens,
            cacheReadTokens: scan.cacheReadTokens,
            cacheWriteTokens: scan.cacheWriteTokens,
            costUsd: scan.costUsd,
            turns: scan.turns,
            durationMs: scan.durationMs,
            recordedAt: new Date(),
          },
        });
      const clear = db.delete(scanFindings).where(eq(scanFindings.scanId, scan.id));
      // -----
      // One batch is one transaction: the scan, its findings
      // and the branch's history change together or not at all.
      // first_seen stays as it was; every other column takes
      // the planned value.
      // -----
      const advance =
        history.length === 0
          ? []
          : [
              db
                .insert(scanRepoFindings)
                .values(history)
                .onConflictDoUpdate({
                  target: [scanRepoFindings.branchId, scanRepoFindings.fingerprint],
                  set: {
                    state: sql`excluded.state`,
                    unchecked: sql`excluded.unchecked`,
                    lastSeenScanId: sql`excluded.last_seen_scan_id`,
                    fixedInScanId: sql`excluded.fixed_in_scan_id`,
                    possibleDuplicateOf: sql`excluded.possible_duplicate_of`,
                    updatedAt: new Date(),
                  },
                }),
            ];
      const insertFindings = rows.length === 0 ? [] : [db.insert(scanFindings).values(rows)];
      await db.batch([upsert, clear, ...insertFindings, ...advance]);
    },
    catch: toDbError,
  });
