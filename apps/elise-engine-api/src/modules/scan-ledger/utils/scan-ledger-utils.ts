import type { scans } from "@repo/db-elise/schema";
import type { FindingOriginValue, FindingSeverityValue, FindingStatusValue, ScanArtifact, ScanRunner, ScanSummary } from "@repo/contracts/elise";
import { ScanStatusSchema, type ScanStatus } from "#/schemas";

type ScanRow = typeof scans.$inferSelect;

// -----
// The scans row and its files, as the API shows them.
// costUsd is numeric in Neon and arrives as text. A row that
// fails the schema is a bug in our own writes, so it throws.
// -----
export const scanRowToStatus = (row: ScanRow, artifacts: ScanArtifact[], summary: ScanSummary | null = null, runner: ScanRunner | null = null): ScanStatus =>
  ScanStatusSchema.parse({
  scanId: row.id,
  accountId: row.tenantId,
  repo: row.repo,
  repoId: row.repoId,
  isPrivate: row.isPrivate,
  commitSha: row.commitSha,
  ref: row.ref,
  branch: row.branch,
  branchId: row.branchId,
  untrackedReason: row.untrackedReason,
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
  summary,
  runner,
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

type FindingCount = { status: FindingStatusValue; severity: FindingSeverityValue | null; origin: FindingOriginValue; total: number };

// -----
// Counts only for a succeeded scan of the skill whose
// findings are recorded: for any other the findings table
// is empty because nothing was read, not because nothing
// was found. A clean lite scan has all zeros.
// -----
export const summaryOf = (row: ScanRow, counts: FindingCount[]): ScanSummary | null => {
  if (row.status !== "succeeded" || row.skill !== "lite") return null;
  const recheck =
    row.priorsGiven === null
      ? null
      : { given: row.priorsGiven, carried: row.priorsCarried ?? 0, closed: row.priorsClosed ?? 0, unchecked: row.priorsUnchecked ?? 0 };
  const summary: ScanSummary = { total: 0, severity: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 }, needsValidation: 0, new: 0, carried: 0, recheck };
  for (const { status, severity, origin, total } of counts) {
    summary.total += total;
    summary[origin] += total;
    if (status === "needs_validation" || severity === null) summary.needsValidation += total;
    else summary.severity[severity] += total;
  }
  return summary;
};
