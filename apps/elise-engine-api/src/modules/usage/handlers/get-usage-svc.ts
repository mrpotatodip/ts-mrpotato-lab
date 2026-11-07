import { Effect } from "effect";
import type { Usage } from "@repo/contracts/elise";
import type { ExternalError } from "#/lib/effect-query";
import { listScanStatusesEffect } from "#/modules/scan-store";
import { SCANS_PAGE_SIZE } from "#/modules/scans/constants";
import { isActiveScan } from "#/modules/scans/utils";
import type { MonthSpend, UsageEnv } from "#/modules/usage/types";
import { reservedUsdOf, summarizeUsage } from "#/modules/usage/utils";

export const getUsageSvc = (env: UsageEnv, accountId: string, spend: MonthSpend): Effect.Effect<Usage, ExternalError> =>
  Effect.gen(function* () {
    const recent = yield* listScanStatusesEffect(env.REPORTS, accountId, SCANS_PAGE_SIZE);
    const now = Date.now();
    const active = recent.scans.filter((scan) => isActiveScan(scan, now));
    return summarizeUsage(new Date(now), spend, env.MONTHLY_BUDGET_USD, reservedUsdOf(active));
  });
