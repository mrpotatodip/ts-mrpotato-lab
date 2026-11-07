import { Effect } from "effect";
import type { ScanUsage } from "@repo/contracts/elise";
import { toExternalError, toParseError, type ExternalError, type ParseError } from "#/lib/effect-query";
import type { ScanParams, ScanState } from "#/schemas";
import { readScanFileEffect, scanKey } from "#/modules/scan-store";
import { SCAN_RECORDS_FINDINGS_FILE, SCAN_RECORDS_RECORDED_SKILL } from "#/modules/scan-records/constants";
import { LiteFindingsSchema, type LiteFinding } from "#/modules/scan-records/schemas";
import type { NewFindingRow, ScanRecord } from "#/modules/scan-records/types";
import { fingerprintOf } from "#/modules/scan-records/utils";

const readFindings = (
  reports: R2Bucket,
  params: ScanParams,
): Effect.Effect<LiteFinding[], ExternalError | ParseError> =>
  Effect.gen(function* () {
    const object = yield* readScanFileEffect(reports, scanKey(params.accountId, params.scanId, SCAN_RECORDS_FINDINGS_FILE));
    if (!object) return [];
    const text = yield* Effect.tryPromise({ try: () => object.text(), catch: toExternalError });
    return yield* Effect.try({ try: () => LiteFindingsSchema.parse(JSON.parse(text)), catch: toParseError });
  });

const toRow = (params: ScanParams, finding: LiteFinding, fingerprint: string): NewFindingRow => ({
  tenantId: params.accountId,
  scanId: params.scanId,
  findingId: finding.id,
  fingerprint,
  status: finding.status,
  severity: finding.status === "confirmed" ? finding.severity : null,
  title: finding.title,
  class: finding.class,
  file: finding.location[0]?.file ?? null,
  line: finding.location[0]?.line ?? null,
  actor: finding.actor ?? null,
  impact: finding.impact ?? null,
  evidence: finding.evidence ?? null,
  fix: finding.fix ?? null,
  needs: finding.needs ?? null,
});

export const buildScanRecordSvc = (
  reports: R2Bucket,
  params: ScanParams,
  status: ScanState,
  error: string | null,
  usage: ScanUsage | null,
): Effect.Effect<ScanRecord, ExternalError | ParseError> =>
  Effect.gen(function* () {
    const found =
      status === "succeeded" && params.options.skill === SCAN_RECORDS_RECORDED_SKILL
        ? yield* readFindings(reports, params)
        : [];
    const fingerprints = yield* Effect.tryPromise({
      try: () => Promise.all(found.map((finding) => fingerprintOf(finding.class, finding.location[0]?.file ?? null, finding.title))),
      catch: toExternalError,
    });
    return {
      scan: {
        id: params.scanId,
        tenantId: params.accountId,
        repo: params.repo,
        status,
        skill: params.options.skill,
        model: params.options.model,
        effort: params.options.effort,
        profile: params.options.profile,
        budget: params.options.budget ?? null,
        maxBudgetUsd: params.options.maxBudgetUsd.toFixed(2),
        error,
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        cacheReadTokens: usage?.cacheReadTokens ?? null,
        cacheWriteTokens: usage?.cacheWriteTokens ?? null,
        costUsd: usage ? usage.costUsd.toFixed(4) : null,
        turns: usage?.turns ?? null,
        durationMs: usage?.durationMs ?? null,
        createdAt: new Date(params.createdAt),
        finishedAt: status === "succeeded" || status === "failed" ? new Date() : null,
      },
      findings: found.map((finding, index) => toRow(params, finding, fingerprints[index])),
    };
  });
