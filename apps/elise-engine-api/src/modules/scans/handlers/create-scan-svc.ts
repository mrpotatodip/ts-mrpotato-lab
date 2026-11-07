import { Effect } from "effect";
import { Invalid, RateLimited, toExternalError, type ExternalError } from "#/lib/effect-query";
import { ScanOptionsSchema, type ScanParams } from "#/schemas";
import { listScanStatusesEffect, newScanId, writeScanStatusEffect } from "#/modules/scan-store";
import { budgetUsdOf, reservedUsdOf, type MonthSpend } from "#/modules/usage";
import { SCANS_PAGE_SIZE } from "#/modules/scans/constants";
import type { CreateScanBody, ScanQueued } from "#/modules/scans/schemas";
import type { CreateScanEnv } from "#/modules/scans/types";
import { isActiveScan } from "#/modules/scans/utils";

export const createScanSvc = (
  env: CreateScanEnv,
  accountId: string,
  input: CreateScanBody,
  spend: MonthSpend,
): Effect.Effect<ScanQueued, Invalid | RateLimited | ExternalError> =>
  Effect.gen(function* () {
    const ceiling = Number(env.MAX_BUDGET_USD);
    const maxBudgetUsd = input.max_budget_usd ?? ceiling;
    if (maxBudgetUsd > ceiling) return yield* new Invalid({ message: `max_budget_usd: must be at most ${ceiling}` });

    const options = yield* Effect.try(() =>
      ScanOptionsSchema.parse({
        skill: input.skill ?? "lite",
        model: input.model ?? env.MODEL,
        effort: input.effort ?? env.EFFORT,
        profile: input.profile ?? "quick",
        budget: input.budget,
        maxBudgetUsd,
      }),
    ).pipe(Effect.orDie);

    const limit = Number(env.MAX_ACTIVE_SCANS);
    const recent = yield* listScanStatusesEffect(env.REPORTS, accountId, SCANS_PAGE_SIZE);
    const activeScans = recent.scans.filter((scan) => isActiveScan(scan, Date.now()));
    const active = activeScans.length;
    if (active >= limit) {
      return yield* new RateLimited({
        code: "TOO_MANY_ACTIVE_SCANS",
        message: `This account already has ${active} active scans (limit ${limit})`,
      });
    }

    const budgetUsd = budgetUsdOf(spend, env.MONTHLY_BUDGET_USD);
    const reservedUsd = reservedUsdOf(activeScans);
    if (spend.spentUsd + reservedUsd + maxBudgetUsd > budgetUsd) {
      return yield* new RateLimited({
        code: "MONTHLY_BUDGET_EXCEEDED",
        message: `This scan could cost up to $${maxBudgetUsd}, but only $${Math.max(0, budgetUsd - spend.spentUsd - reservedUsd).toFixed(2)} of the $${budgetUsd} monthly budget is left`,
      });
    }

    const params: ScanParams = { scanId: newScanId(), accountId, repo: input.repo, options, createdAt: new Date().toISOString() };
    yield* writeScanStatusEffect(env.REPORTS, params, "queued");
    yield* Effect.tryPromise({ try: () => env.SCAN_WORKFLOW.create({ id: params.scanId, params }), catch: toExternalError });
    return { scanId: params.scanId, status: "queued" as const, ...options };
  });
