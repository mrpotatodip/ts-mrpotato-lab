import { Effect } from "effect";
import { Invalid, RateLimited, toExternalError, type Conflict, type DbError, type ExternalError } from "#/lib/effect-query";
import { ScanOptionsSchema, type ScanParams } from "#/schemas";
import { normalizeBranchName } from "#/modules/branches";
import { RUNNER_JOB_NOT_CONNECTED, RUNNER_JOB_PRIVATE } from "#/modules/runners/constants";
import type { GithubAccess } from "#/modules/github-installs";
import { newScanId } from "#/modules/scan-store";
import type { ScanRepo } from "#/modules/scan-ledger";
import { SCANS_ACTIVE_WINDOW_MS } from "#/modules/scans/constants";
import type { CreateScanBody, ScanQueued } from "#/modules/scans/schemas";
import type { CreateScanEnv } from "#/modules/scans/types";
import { scanBlockOf } from "#/modules/billing";
import { holdOf, type HoldCredit } from "#/modules/credit";
import { budgetUsdOf, reservedUsdOf, type MonthSpend } from "#/modules/usage";

// -----
// Whether a Runner of the Account has paired and is not removed.
// -----
export type RunnerConnected = (runnerId: string) => Effect.Effect<boolean, DbError>;

export const createScanSvc = (
  env: CreateScanEnv,
  repo: ScanRepo,
  accountId: string,
  input: CreateScanBody,
  spend: MonthSpend,
  access?: GithubAccess,
  hold?: HoldCredit,
  runnerConnected?: RunnerConnected,
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

    const block = scanBlockOf(spend.plan, env.BILLING_ENFORCED === "true", new Date());
    if (block) return yield* new RateLimited(block);

    const limit = Number(env.MAX_ACTIVE_SCANS);
    const activeScans = yield* repo.activeSince(accountId, Date.now() - SCANS_ACTIVE_WINDOW_MS);
    const active = activeScans.length;
    if (active >= limit) {
      return yield* new RateLimited({
        code: "TOO_MANY_ACTIVE_SCANS",
        message: `This account already has ${active} active scans (limit ${limit})`,
      });
    }

    // -----
    // A Scan on a Runner runs on the person's own Claude, so it takes
    // no credit, needs no key of the Account's, and does not count
    // against the plan's allowance or the monthly budget. The Runner
    // must belong to the Account and be paired.
    // -----
    const runnerId = input.runner_id;
    if (runnerId !== undefined && !(runnerConnected ? yield* runnerConnected(runnerId) : false)) {
      return yield* new Invalid({ message: RUNNER_JOB_NOT_CONNECTED });
    }
    const onRunner = runnerId !== undefined;

    // -----
    // The plan decides the key. A platform plan always uses the
    // platform's key and takes credit for the scan; an account plan
    // needs the Account's own key and takes none. An Account with no
    // plan uses its own key when it has one, as before.
    // -----
    const plan = spend.plan;
    const usesOwnKey = onRunner || (plan ? plan.keySource === "account" : spend.ownKey);
    if (!onRunner && plan?.keySource === "account" && !spend.ownKey) {
      return yield* new RateLimited({ code: "OWN_KEY_REQUIRED", message: "This plan runs scans on your own Anthropic key. Add it in Settings to run scans." });
    }
    if (!onRunner && plan && plan.monthlyScanAllowance !== null && spend.scans >= plan.monthlyScanAllowance) {
      return yield* new RateLimited({
        code: "SCAN_ALLOWANCE_EXCEEDED",
        message: `This plan allows ${plan.monthlyScanAllowance} scans a month and this account has used them. The allowance starts again on the 1st`,
      });
    }
    const holdUsd = !onRunner && plan && plan.keySource === "platform" ? holdOf(maxBudgetUsd, plan.creditMarkup) : 0;
    if (plan && holdUsd > plan.creditBalanceUsd) {
      return yield* new RateLimited({
        code: "INSUFFICIENT_CREDIT",
        message: `This scan could take up to $${holdUsd.toFixed(2)} of credit, but the balance is $${Math.max(0, plan.creditBalanceUsd).toFixed(2)}. Top up in Settings`,
      });
    }

    // -----
    // The monthly budget is an optional guard for an Account on a plan:
    // it applies once an admin sets one, and counts in credit dollars
    // (cost times the markup). An Account with no plan always has it.
    // -----
    if (!onRunner && (plan === null || spend.budgetOverrideUsd !== null)) {
      const markup = plan && plan.keySource === "platform" ? plan.creditMarkup : 1;
      const budgetUsd = budgetUsdOf(spend, env);
      const reservedUsd = reservedUsdOf(activeScans);
      const usedUsd = (spend.spentUsd + reservedUsd + maxBudgetUsd) * markup;
      if (usedUsd > budgetUsd) {
        return yield* new RateLimited({
          code: "MONTHLY_BUDGET_EXCEEDED",
          message: `This scan could cost up to $${(maxBudgetUsd * markup).toFixed(2)}, but only $${Math.max(0, budgetUsd - (spend.spentUsd + reservedUsd) * markup).toFixed(2)} of the $${budgetUsd} monthly budget is left`,
        });
      }
    }

    const record = yield* repo.ensureRepo(accountId, input.repo);
    // -----
    // One spelling per branch (refs/heads/x is x, HEAD is no ref).
    // Whether the ref is a branch, a tag or a commit is settled by
    // the clone, which tries it as a branch first.
    // -----
    const ref = input.ref === undefined ? undefined : (normalizeBranchName(input.ref) ?? undefined);
    const github = access === undefined ? null : yield* access.forRepo(record.url);
    if (onRunner && github) return yield* new Invalid({ message: RUNNER_JOB_PRIVATE });
    const params: ScanParams = {
      scanId: newScanId(),
      accountId,
      repo: record.url,
      ref,
      github: github ?? undefined,
      options,
      keySource: usesOwnKey ? "account" : "platform",
      runnerId,
      createdAt: new Date().toISOString(),
    };
    yield* repo.create(params, record.id, Date.now() - SCANS_ACTIVE_WINDOW_MS);
    // -----
    // The check above read the balance; this takes it, under a lock.
    // A scan that lost the race to another is failed, not started.
    // -----
    if (holdUsd > 0) {
      if (!hold) return yield* Effect.die(new Error("a platform plan needs a credit hold"));
      const held = yield* hold(params.scanId, holdUsd);
      if (!held.held) {
        yield* repo.mark(accountId, params.scanId, { status: "failed", error: "not enough credit for this scan" }).pipe(Effect.ignore);
        return yield* new RateLimited({
          code: "INSUFFICIENT_CREDIT",
          message: `This scan could take up to $${holdUsd.toFixed(2)} of credit, but the balance is $${Math.max(0, held.balanceUsd).toFixed(2)}. Top up in Settings`,
        });
      }
    }
    yield* Effect.tryPromise({ try: () => env.SCAN_WORKFLOW.create({ id: params.scanId, params }), catch: toExternalError }).pipe(
      Effect.tapError((error) =>
        repo.mark(accountId, params.scanId, { status: "failed", error: `could not start the workflow: ${String(error.cause)}` }).pipe(Effect.ignore),
      ),
    );
    return { scanId: params.scanId, status: "queued" as const, ...options };
  });
