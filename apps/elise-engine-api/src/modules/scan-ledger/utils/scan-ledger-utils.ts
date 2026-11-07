import type { scans } from "@repo/db-elise/schema";
import type { ScanArtifact } from "@repo/contracts/elise";
import { ScanStatusSchema, type ScanStatus } from "#/schemas";

type ScanRow = typeof scans.$inferSelect;

// -----
// The scans row and its files, as the API shows them.
// costUsd is numeric in Neon and arrives as text. A row that
// fails the schema is a bug in our own writes, so it throws.
// -----
export const scanRowToStatus = (row: ScanRow, artifacts: ScanArtifact[]): ScanStatus =>
  ScanStatusSchema.parse({
  scanId: row.id,
  accountId: row.tenantId,
  repo: row.repo,
  skill: row.skill,
  model: row.model,
  effort: row.effort,
  profile: row.profile,
  budget: row.budget ?? undefined,
  maxBudgetUsd: Number(row.maxBudgetUsd),
  status: row.status,
  step: row.step,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  finishedAt: row.finishedAt?.toISOString() ?? null,
  error: row.error,
  files: artifacts.length > 0 ? artifacts.map((artifact) => artifact.name) : null,
  artifacts,
  usage:
    row.costUsd === null
      ? null
      : {
          inputTokens: row.inputTokens ?? 0,
          outputTokens: row.outputTokens ?? 0,
          cacheReadTokens: row.cacheReadTokens ?? 0,
          cacheWriteTokens: row.cacheWriteTokens ?? 0,
          costUsd: Number(row.costUsd),
          turns: row.turns,
          durationMs: row.durationMs,
        },
  });