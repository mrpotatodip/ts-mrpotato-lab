import { Effect } from "effect";
import { DbError } from "#/lib/effect-query";
import type { ScanStatus } from "#/schemas";
import type { NewScanFile, ScanRepo } from "#/modules/scan-ledger";

type StoredFile = NewScanFile & { accountId: string; scanId: string };

// -----
// A faithful in-memory ScanRepo: same rules as the Neon
// one (account scoping, newest-first ids as cursors,
// files by name), so a test needs no database.
// -----
export function memoryScanRepo() {
  const rows = new Map<string, ScanStatus>();
  const files = new Map<string, StoredFile>();

  const artifactsOf = (scanId: string) =>
    [...files.values()]
      .filter((file) => file.scanId === scanId)
      .map(({ name, sizeBytes, contentType }) => ({ name, sizeBytes, contentType }))
      .toSorted((a, b) => a.name.localeCompare(b.name));

  const withFiles = (row: ScanStatus): ScanStatus => {
    const artifacts = artifactsOf(row.scanId);
    return { ...row, artifacts, files: artifacts.length > 0 ? artifacts.map((artifact) => artifact.name) : null };
  };

  const repo: ScanRepo = {
    create: (params) =>
      Effect.sync(() => {
        const now = new Date().toISOString();
        rows.set(params.scanId, {
          scanId: params.scanId,
          accountId: params.accountId,
          repo: params.repo,
          ...params.options,
          status: "queued",
          step: null,
          createdAt: params.createdAt,
          updatedAt: now,
          finishedAt: null,
          error: null,
          files: null,
          usage: null,
        });
      }),
    mark: (accountId, scanId, patch) =>
      Effect.sync(() => {
        const row = rows.get(scanId);
        if (!row || row.accountId !== accountId) return;
        const now = new Date().toISOString();
        const ended = patch.status === "succeeded" || patch.status === "failed";
        rows.set(scanId, {
          ...row,
          ...(patch.status !== undefined && { status: patch.status }),
          ...(patch.step !== undefined && { step: patch.step }),
          ...(patch.error !== undefined && { error: patch.error }),
          ...(patch.usage && { usage: patch.usage }),
          ...(ended && { finishedAt: now, step: null }),
          updatedAt: now,
        });
      }),
    addFiles: (accountId, scanId, added) =>
      Effect.sync(() => {
        for (const file of added) files.set(`${scanId}/${file.name}`, { ...file, accountId, scanId });
      }),
    list: (accountId, limit, cursor) =>
      Effect.sync(() => {
        const mine = [...rows.values()]
          .filter((row) => row.accountId === accountId && (cursor === undefined || row.scanId > cursor))
          .toSorted((a, b) => a.scanId.localeCompare(b.scanId));
        const page = mine.slice(0, limit).map(withFiles);
        return { scans: page, nextCursor: mine.length > limit ? page[page.length - 1].scanId : null };
      }),
    get: (accountId, scanId) =>
      Effect.sync(() => {
        const row = rows.get(scanId);
        return row && row.accountId === accountId ? withFiles(row) : null;
      }),
    activeSince: (accountId, sinceMs) =>
      Effect.sync(() =>
        [...rows.values()]
          .filter((row) => row.accountId === accountId && (row.status === "queued" || row.status === "running") && Date.parse(row.updatedAt) >= sinceMs)
          .map(withFiles),
      ),
    file: (accountId, scanId, name) =>
      Effect.sync(() => {
        const file = files.get(`${scanId}/${name}`);
        return file && file.accountId === accountId ? { r2Key: file.r2Key, contentType: file.contentType } : null;
      }),
  };

  return { repo, rows, files };
}

// -----
// Every call fails with a DbError, for the error paths.
// -----
export const brokenScanRepo: ScanRepo = {
  create: () => Effect.fail(new DbError({ cause: new Error("db down") })),
  mark: () => Effect.fail(new DbError({ cause: new Error("db down") })),
  addFiles: () => Effect.fail(new DbError({ cause: new Error("db down") })),
  list: () => Effect.fail(new DbError({ cause: new Error("db down") })),
  get: () => Effect.fail(new DbError({ cause: new Error("db down") })),
  activeSince: () => Effect.fail(new DbError({ cause: new Error("db down") })),
  file: () => Effect.fail(new DbError({ cause: new Error("db down") })),
};
