import type { Effect } from "effect";
import type { ScanArtifact, ScanUsage } from "@repo/contracts/elise";
import type { DbError } from "#/lib/effect-query";
import type { ScanParams, ScanState, ScanStatus } from "#/schemas";

// -----
// What changes on the way: state, step, error and
// what was spent. Anything left out stays as it is.
// -----
export type ScanPatch = {
  status?: ScanState;
  step?: ScanStatus["step"];
  error?: string | null;
  usage?: ScanUsage | null;
};

export type NewScanFile = ScanArtifact & { r2Key: string };

export type ScanFileRef = { r2Key: string; contentType: string };

export type ScanPage = { scans: ScanStatus[]; nextCursor: string | null };

// -----
// Neon is the record of every scan. The workflow
// writes it; the routes only read it. R2 holds the
// bytes of each file, and scan_files says where.
// -----
export type ScanRepo = {
  create: (params: ScanParams) => Effect.Effect<void, DbError>;
  mark: (accountId: string, scanId: string, patch: ScanPatch) => Effect.Effect<void, DbError>;
  addFiles: (accountId: string, scanId: string, files: NewScanFile[]) => Effect.Effect<void, DbError>;
  list: (accountId: string, limit: number, cursor?: string) => Effect.Effect<ScanPage, DbError>;
  get: (accountId: string, scanId: string) => Effect.Effect<ScanStatus | null, DbError>;
  activeSince: (accountId: string, sinceMs: number) => Effect.Effect<ScanStatus[], DbError>;
  file: (accountId: string, scanId: string, name: string) => Effect.Effect<ScanFileRef | null, DbError>;
};
