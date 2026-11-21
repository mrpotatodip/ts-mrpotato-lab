import { and, count, eq, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";
import type { ScanStateValue } from "@repo/contracts/elise";
import { scanFindings, scans } from "@repo/db-elise/schema";
import type { AppDbType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import type { NewFindingRow } from "#/modules/scan-records/types";

export const lockScanStatusEffect = (db: AppDbType, tenantId: string, scanId: string): Effect.Effect<ScanStateValue | null, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ status: scans.status })
        .from(scans)
        .where(and(eq(scans.tenantId, tenantId), eq(scans.id, scanId)))
        .for("share")
        .then(([row]) => row?.status ?? null),
    catch: toDbError,
  });

export const countLiveFindingsEffect = (db: AppDbType, scanId: string): Effect.Effect<number, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ total: count() })
        .from(scanFindings)
        .where(eq(scanFindings.scanId, scanId))
        .then(([row]) => row?.total ?? 0),
    catch: toDbError,
  });

export const knownFindingIdsEffect = (db: AppDbType, scanId: string, ids: readonly string[]): Effect.Effect<Set<string>, DbError> =>
  ids.length === 0
    ? Effect.succeed(new Set<string>())
    : Effect.tryPromise({
        try: () =>
          db
            .select({ findingId: scanFindings.findingId })
            .from(scanFindings)
            .where(and(eq(scanFindings.scanId, scanId), inArray(scanFindings.findingId, [...ids])))
            .then((rows) => new Set(rows.map((row) => row.findingId))),
        catch: toDbError,
      });

export const upsertLiveFindingsEffect = (db: AppDbType, rows: readonly NewFindingRow[]): Effect.Effect<void, DbError> =>
  rows.length === 0
    ? Effect.void
    : Effect.tryPromise({
        try: () =>
          db
            .insert(scanFindings)
            .values([...rows])
            .onConflictDoUpdate({
              target: [scanFindings.scanId, scanFindings.findingId],
              set: {
                fingerprint: sql`excluded.fingerprint`,
                status: sql`excluded.status`,
                severity: sql`excluded.severity`,
                title: sql`excluded.title`,
                file: sql`excluded.file`,
                line: sql`excluded.line`,
                impact: sql`excluded.impact`,
                evidence: sql`excluded.evidence`,
                fix: sql`excluded.fix`,
                needs: sql`excluded.needs`,
              },
            }),
        catch: toDbError,
      }).pipe(Effect.asVoid);
