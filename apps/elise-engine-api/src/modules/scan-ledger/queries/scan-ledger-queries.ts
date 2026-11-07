import { and, asc, eq, gt, gte, inArray, or, sql } from "drizzle-orm";
import { Effect } from "effect";
import { scanFiles, scans } from "@repo/db-elise/schema";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import type { ScanStatus } from "#/schemas";
import type { ScanPage, ScanRepo } from "#/modules/scan-ledger/types";
import { scanRowToStatus } from "#/modules/scan-ledger/utils";

type ScanRow = typeof scans.$inferSelect;

const withFiles = (db: DbConnectType, rows: ScanRow[]): Effect.Effect<ScanStatus[], DbError> =>
  rows.length === 0
    ? Effect.succeed([])
    : Effect.tryPromise({
        try: () =>
          db
            .select({ scanId: scanFiles.scanId, name: scanFiles.name, sizeBytes: scanFiles.sizeBytes, contentType: scanFiles.contentType })
            .from(scanFiles)
            .where(inArray(scanFiles.scanId, rows.map((row) => row.id)))
            .orderBy(asc(scanFiles.name)),
        catch: toDbError,
      }).pipe(
        Effect.map((files) =>
          rows.map((row) =>
            scanRowToStatus(
              row,
              files.filter((file) => file.scanId === row.id).map(({ name, sizeBytes, contentType }) => ({ name, sizeBytes, contentType })),
            ),
          ),
        ),
      );

// -----
// A scan id starts with an inverted timestamp, so
// ascending ids are newest first and an id is a cursor.
// -----
export const neonScanRepo = (db: DbConnectType): ScanRepo => ({
  create: (params) =>
    Effect.tryPromise({
      try: () =>
        db.insert(scans).values({
          id: params.scanId,
          tenantId: params.accountId,
          repo: params.repo,
          status: "queued",
          skill: params.options.skill,
          model: params.options.model,
          effort: params.options.effort,
          profile: params.options.profile,
          budget: params.options.budget ?? null,
          maxBudgetUsd: params.options.maxBudgetUsd.toFixed(2),
          createdAt: new Date(params.createdAt),
        }),
      catch: toDbError,
    }).pipe(Effect.asVoid),

  mark: (accountId, scanId, patch) => {
    const ended = patch.status === "succeeded" || patch.status === "failed";
    return Effect.tryPromise({
      try: () =>
        db
          .update(scans)
          .set({
            ...(patch.status !== undefined && { status: patch.status }),
            ...(patch.step !== undefined && { step: patch.step }),
            ...(patch.error !== undefined && { error: patch.error }),
            ...(ended && { finishedAt: new Date(), step: null }),
            ...(patch.usage && {
              inputTokens: patch.usage.inputTokens,
              outputTokens: patch.usage.outputTokens,
              cacheReadTokens: patch.usage.cacheReadTokens,
              cacheWriteTokens: patch.usage.cacheWriteTokens,
              costUsd: patch.usage.costUsd.toFixed(4),
              turns: patch.usage.turns,
              durationMs: patch.usage.durationMs,
            }),
            updatedAt: new Date(),
          })
          .where(and(eq(scans.tenantId, accountId), eq(scans.id, scanId))),
      catch: toDbError,
    }).pipe(Effect.asVoid);
  },

  addFiles: (accountId, scanId, files) =>
    files.length === 0
      ? Effect.void
      : Effect.tryPromise({
          try: () =>
            db
              .insert(scanFiles)
              .values(
                files.map((file) => ({
                  tenantId: accountId,
                  scanId,
                  name: file.name,
                  r2Key: file.r2Key,
                  sizeBytes: file.sizeBytes,
                  contentType: file.contentType,
                })),
              )
              .onConflictDoUpdate({
                target: [scanFiles.scanId, scanFiles.name],
                set: { sizeBytes: sql`excluded.size_bytes`, contentType: sql`excluded.content_type`, r2Key: sql`excluded.r2_key` },
              }),
          catch: toDbError,
        }).pipe(Effect.asVoid),

  list: (accountId, limit, cursor): Effect.Effect<ScanPage, DbError> =>
    Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(scans)
          .where(and(eq(scans.tenantId, accountId), cursor ? gt(scans.id, cursor) : undefined))
          .orderBy(asc(scans.id))
          .limit(limit + 1),
      catch: toDbError,
    }).pipe(
      Effect.flatMap((rows) =>
        withFiles(db, rows.slice(0, limit)).pipe(
          Effect.map((page) => ({ scans: page, nextCursor: rows.length > limit ? rows[limit - 1].id : null })),
        ),
      ),
    ),

  get: (accountId, scanId) =>
    Effect.tryPromise({
      try: () => db.select().from(scans).where(and(eq(scans.tenantId, accountId), eq(scans.id, scanId))),
      catch: toDbError,
    }).pipe(
      Effect.flatMap((rows) => withFiles(db, rows)),
      Effect.map((found) => found[0] ?? null),
    ),

  activeSince: (accountId, sinceMs) =>
    Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(scans)
          .where(
            and(
              eq(scans.tenantId, accountId),
              or(eq(scans.status, "queued"), eq(scans.status, "running")),
              gte(scans.updatedAt, new Date(sinceMs)),
            ),
          ),
      catch: toDbError,
    }).pipe(Effect.flatMap((rows) => withFiles(db, rows))),

  file: (accountId, scanId, name) =>
    Effect.tryPromise({
      try: () =>
        db
          .select({ r2Key: scanFiles.r2Key, contentType: scanFiles.contentType })
          .from(scanFiles)
          .where(and(eq(scanFiles.tenantId, accountId), eq(scanFiles.scanId, scanId), eq(scanFiles.name, name))),
      catch: toDbError,
    }).pipe(Effect.map((rows) => rows[0] ?? null)),
});
