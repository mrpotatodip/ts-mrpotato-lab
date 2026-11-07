import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { scanFindings, scans } from "@repo/db-elise/schema";
import { toDbError, type DbError } from "#/lib/effect-query";
import type { DbConnectType } from "#/lib/db-connection";
import type { ScanRecord } from "#/modules/scan-records/types";

export const writeScanRecordEffect = (db: DbConnectType, record: ScanRecord): Effect.Effect<void, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const { scan, findings: rows } = record;
      const upsert = db
        .insert(scans)
        .values(scan)
        .onConflictDoUpdate({
          target: scans.id,
          set: {
            status: scan.status,
            error: scan.error,
            finishedAt: scan.finishedAt,
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
      if (rows.length === 0) {
        await db.batch([upsert, clear]);
        return;
      }
      await db.batch([upsert, clear, db.insert(scanFindings).values(rows)]);
    },
    catch: toDbError,
  });
