import { Effect } from "effect";
import type { Usage } from "@repo/contracts/elise";
import type { DbError } from "#/lib/effect-query";
import type { ScanRepo } from "#/modules/scan-ledger";
import type { MonthSpend, UsageEnv } from "#/modules/usage/types";
import { reservedUsdOf, summarizeUsage } from "#/modules/usage/utils";

export const getUsageSvc = (env: UsageEnv, repo: ScanRepo, accountId: string, spend: MonthSpend): Effect.Effect<Usage, DbError> =>
  Effect.gen(function* () {
    const now = Date.now();
    const active = yield* repo.activeSince(accountId, now);
    return summarizeUsage(new Date(now), spend, env, reservedUsdOf(active));
  });
