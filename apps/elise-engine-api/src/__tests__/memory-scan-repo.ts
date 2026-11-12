import { Effect } from "effect";
import { Conflict, DbError } from "#/lib/effect-query";
import { activeWindowMsOf, canonicalRepo, displayRepoUrl } from "#/modules/scan-ledger/utils";
import type { ScanStatus } from "#/schemas";
import type { NewScanFile, RepoRecord, ScanRepo } from "#/modules/scan-ledger";

type StoredFile = NewScanFile & { accountId: string; scanId: string };

// -----
// Queued or running and not stalled, each Skill by its own
// window, as the Neon repo judges it.
// -----
const isLive = (row: ScanStatus, nowMs: number) =>
  (row.status === "queued" || row.status === "running") && Date.parse(row.updatedAt) >= nowMs - activeWindowMsOf(row.skill);

// -----
// A faithful in-memory ScanRepo: same rules as the Neon
// one (account scoping, newest-first ids as cursors,
// files by name), so a test needs no database.
// -----
export function memoryScanRepo() {
  const rows = new Map<string, ScanStatus>();
  const files = new Map<string, StoredFile>();
  const repos = new Map<string, RepoRecord>();
  const onRunner = new Set<string>();

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
    ensureRepo: (accountId, url) =>
      Effect.sync(() => {
        const canonical = canonicalRepo(url);
        const key = `${accountId}/${canonical}`;
        const found = repos.get(key) ?? { id: crypto.randomUUID(), canonical, url: displayRepoUrl(url) };
        repos.set(key, found);
        return found;
      }),
    create: (params, repoId, nowMs) =>
      Effect.suspend(() => {
        const live = [...rows.values()].find((row) => row.repoId === repoId && isLive(row, nowMs));
        if (live) return Effect.fail(new Conflict({ message: `This repo already has an active scan: ${live.scanId}` }));
        if (params.runnerId !== undefined) onRunner.add(params.scanId);
        const now = new Date().toISOString();
        rows.set(params.scanId, {
          scanId: params.scanId,
          accountId: params.accountId,
          repo: params.repo,
          repoId,
          ref: params.ref ?? null,
          branch: null,
          branchId: null,
          untrackedReason: null,
          commitSha: null,
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
        return Effect.void;
      }),
    mark: (accountId, scanId, patch) =>
      Effect.sync(() => {
        const row = rows.get(scanId);
        if (!row || row.accountId !== accountId) return;
        if (row.status === "failed" && patch.status !== "failed") return;
        const now = new Date().toISOString();
        const ended = patch.status === "succeeded" || patch.status === "failed";
        rows.set(scanId, {
          ...row,
          ...(patch.status !== undefined && { status: patch.status }),
          ...(patch.step !== undefined && { step: patch.step }),
          ...(patch.error !== undefined && { error: patch.error }),
          ...(patch.commitSha !== undefined && { commitSha: patch.commitSha }),
          ...(patch.branch !== undefined && { branch: patch.branch }),
          ...(patch.usage && { usage: patch.usage }),
          ...(ended && { finishedAt: now, step: null }),
          updatedAt: now,
        });
      }),
    addFiles: (accountId, scanId, added) =>
      Effect.sync(() => {
        for (const file of added) files.set(`${scanId}/${file.name}`, { ...file, accountId, scanId });
      }),
    list: (accountId, limit, cursor, filter) =>
      Effect.sync(() => {
        const mine = [...rows.values()]
          .filter(
            (row) =>
              row.accountId === accountId &&
              (cursor === undefined || row.scanId > cursor) &&
              (filter?.repoId === undefined || row.repoId === filter.repoId) &&
              (filter?.status === undefined || row.status === filter.status),
          )
          .toSorted((a, b) => a.scanId.localeCompare(b.scanId));
        const page = mine.slice(0, limit).map(withFiles);
        return { scans: page, nextCursor: mine.length > limit ? page[page.length - 1].scanId : null };
      }),
    get: (accountId, scanId) =>
      Effect.sync(() => {
        const row = rows.get(scanId);
        return row && row.accountId === accountId ? withFiles(row) : null;
      }),
    activeSince: (accountId, nowMs) => Effect.sync(() => [...rows.values()].filter((row) => row.accountId === accountId && isLive(row, nowMs)).map(withFiles)),
    activeCounts: (nowMs) =>
      Effect.sync(() => {
        const ours = [...rows.values()].filter((row) => isLive(row, nowMs) && !onRunner.has(row.scanId));
        return { lite: ours.filter((row) => row.skill !== "full").length, full: ours.filter((row) => row.skill === "full").length };
      }),
    file: (accountId, scanId, name) =>
      Effect.sync(() => {
        const file = files.get(`${scanId}/${name}`);
        return file && file.accountId === accountId ? { r2Key: file.r2Key, contentType: file.contentType } : null;
      }),
  };

  return { repo, rows, files, repos };
}

// -----
// Every call fails with a DbError, for the error paths.
// -----
export const brokenScanRepo: ScanRepo = {
  ensureRepo: () => Effect.fail(new DbError({ cause: new Error("db down") })),
  create: () => Effect.fail(new DbError({ cause: new Error("db down") })),
  mark: () => Effect.fail(new DbError({ cause: new Error("db down") })),
  addFiles: () => Effect.fail(new DbError({ cause: new Error("db down") })),
  list: () => Effect.fail(new DbError({ cause: new Error("db down") })),
  get: () => Effect.fail(new DbError({ cause: new Error("db down") })),
  activeSince: () => Effect.fail(new DbError({ cause: new Error("db down") })),
  activeCounts: () => Effect.fail(new DbError({ cause: new Error("db down") })),
  file: () => Effect.fail(new DbError({ cause: new Error("db down") })),
};
