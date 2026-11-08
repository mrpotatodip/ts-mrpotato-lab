import { Effect } from "effect";
import { Invalid, RateLimited, toExternalError, type Conflict, type DbError, type ExternalError } from "#/lib/effect-query";
import { ScanOptionsSchema, type ScanParams } from "#/schemas";
import { normalizeBranchName } from "#/modules/branches";
import { newScanId } from "#/modules/scan-store";
import type { ScanRepo } from "#/modules/scan-ledger";
import { SCANS_ACTIVE_WINDOW_MS } from "#/modules/scans/constants";
import type { CreateScanBody, ScanQueued } from "#/modules/scans/schemas";
import type { CreateScanEnv } from "#/modules/scans/types";
import { budgetUsdOf, reservedUsdOf, type MonthSpend } from "#/modules/usage";

export const createScanSvc = (
  env: CreateScanEnv,
  repo: ScanRepo,
  accountId: string,
  input: CreateScanBody,
  spend: MonthSpend,
): Effect.Effect<ScanQueued, Invalid | RateLimited | Conflict | DbError | ExternalError> =>
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
    const activeScans = yield* repo.activeSince(accountId, Date.now() - SCANS_ACTIVE_WINDOW_MS);
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

    const record = yield* repo.ensureRepo(accountId, input.repo);
    // -----
    // One spelling per branch (refs/heads/x is x, HEAD is no ref).
    // Whether the ref is a branch, a tag or a commit is settled by
    // the clone, which tries it as a branch first.
    // -----
    const ref = input.ref === undefined ? undefined : (normalizeBranchName(input.ref) ?? undefined);
    const params: ScanParams = { scanId: newScanId(), accountId, repo: record.url, ref, options, createdAt: new Date().toISOString() };
    yield* repo.create(params, record.id, Date.now() - SCANS_ACTIVE_WINDOW_MS);
    yield* Effect.tryPromise({ try: () => env.SCAN_WORKFLOW.create({ id: params.scanId, params }), catch: toExternalError }).pipe(
      Effect.tapError((error) =>
        repo.mark(accountId, params.scanId, { status: "failed", error: `could not start the workflow: ${String(error.cause)}` }).pipe(Effect.ignore),
      ),
    );
    return { scanId: params.scanId, status: "queued" as const, ...options };
  });
