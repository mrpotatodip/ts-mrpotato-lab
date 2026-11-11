import { and, asc, count, desc, eq, gte, ilike, inArray, like, lte, type SQL } from "drizzle-orm";
import { Effect } from "effect";
import { FILE_LISTED_NAMES, type FileCount, type FileEntry, type FileName, type FilesQuery, type ScanState } from "@repo/contracts/elise";
import { scanFiles, scans } from "@repo/db-elise/schema";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import { scanPrefix } from "#/modules/scan-store";

const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (char) => `\\${char}`);

// -----
// The Account is checked twice: the rows are the tenant's, and
// each R2 key sits under the Account's prefix. A row whose key
// points elsewhere is not listed. The list and the counts share
// these filters; only the list narrows to one file type.
// -----
const accountFilters = (accountId: string, query: FilesQuery): (SQL | undefined)[] => [
  eq(scanFiles.tenantId, accountId),
  like(scanFiles.r2Key, `${escapeLike(scanPrefix(accountId))}%`),
  inArray(scanFiles.name, [...FILE_LISTED_NAMES]),
  query.repoId ? eq(scans.repoId, query.repoId) : undefined,
  query.branch ? eq(scans.branch, query.branch) : undefined,
  query.q ? ilike(scans.repo, `%${escapeLike(query.q)}%`) : undefined,
  query.from ? gte(scanFiles.createdAt, new Date(query.from)) : undefined,
  query.to ? lte(scanFiles.createdAt, new Date(query.to)) : undefined,
];

// -----
// How many files each type has under every filter except the type,
// so a tab says what it would show. A type with no files counts 0.
// -----
export const countFilesEffect = (db: DbConnectType, accountId: string, query: FilesQuery): Effect.Effect<FileCount[], DbError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select({ name: scanFiles.name, total: count() })
        .from(scanFiles)
        .innerJoin(scans, and(eq(scans.id, scanFiles.scanId), eq(scans.tenantId, scanFiles.tenantId)))
        .where(and(...accountFilters(accountId, query)))
        .groupBy(scanFiles.name);
      return FILE_LISTED_NAMES.map((name) => ({ name, count: rows.find((row) => row.name === name)?.total ?? 0 }));
    },
    catch: toDbError,
  });

// -----
// One row more than asked tells whether another page exists.
// -----
export const listFilesEffect = (db: DbConnectType, accountId: string, query: FilesQuery): Effect.Effect<FileEntry[], DbError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select({ file: scanFiles, scan: scans })
        .from(scanFiles)
        .innerJoin(scans, and(eq(scans.id, scanFiles.scanId), eq(scans.tenantId, scanFiles.tenantId)))
        .where(and(...accountFilters(accountId, query), query.name ? eq(scanFiles.name, query.name) : undefined))
        .orderBy(desc(scanFiles.createdAt), asc(scanFiles.scanId), asc(scanFiles.name))
        .limit(query.limit + 1)
        .offset(query.cursor ? Number(query.cursor) : 0);
      return rows.map(({ file, scan }) => ({
        scanId: file.scanId,
        // SAFETY: the query keeps only names in FILE_LISTED_NAMES.
        name: file.name as FileName,
        repoId: scan.repoId,
        repo: scan.repo,
        branch: scan.branch,
        status: scan.status satisfies ScanState,
        sizeBytes: file.sizeBytes,
        contentType: file.contentType,
        createdAt: file.createdAt.toISOString(),
      }));
    },
    catch: toDbError,
  });
