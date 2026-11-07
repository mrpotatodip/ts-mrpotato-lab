import { Cause, Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";
import { fakeBindings } from "#/__tests__/fake-bindings";
import type { MonthSpend } from "#/modules/usage";
import { createScanSvc, detailScanSvc, readScanFileSvc } from "#/modules/scans/handlers";
import type { CreateScanBody } from "#/modules/scans/schemas";

const input: CreateScanBody = { repo: "https://github.com/octocat/Hello-World" };

const down = async () => {
  throw new Error("down");
};

const NO_SPEND: MonthSpend = { spentUsd: 0, scans: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, budgetOverrideUsd: null };

describe("createScanSvc", () => {
  it("queues a scan with the defaults", async () => {
    const { env, created } = fakeBindings();
    const queued = await Effect.runPromise(createScanSvc(env, "acme", input, NO_SPEND));

    expect(queued).toMatchObject({ status: "queued", skill: "lite", profile: "quick", model: "claude-sonnet-5-5", maxBudgetUsd: 2 });
    expect(created).toHaveLength(1);
  });

  it("fails with Invalid when the dollar cap is above the ceiling", async () => {
    const error = await Effect.runPromise(Effect.flip(createScanSvc(fakeBindings().env, "acme", { ...input, max_budget_usd: 5 }, NO_SPEND)));

    expect(error._tag).toBe("Invalid");
  });

  it("fails with RateLimited at the active scan limit", async () => {
    const { env } = fakeBindings({ MAX_ACTIVE_SCANS: "1" });
    await Effect.runPromise(createScanSvc(env, "acme", input, NO_SPEND));
    const error = await Effect.runPromise(Effect.flip(createScanSvc(env, "acme", input, NO_SPEND)));

    expect(error).toMatchObject({ _tag: "RateLimited", code: "TOO_MANY_ACTIVE_SCANS" });
  });

  it("fails with ExternalError when the workflow cannot start", async () => {
    // SAFETY: the service calls only create on the workflow.
    const { env } = fakeBindings({ SCAN_WORKFLOW: { create: down } as never });
    const error = await Effect.runPromise(Effect.flip(createScanSvc(env, "acme", input, NO_SPEND)));

    expect(error._tag).toBe("ExternalError");
  });

  it("dies, and does not fail, when the default model in the config is not on the list", async () => {
    const { env } = fakeBindings({ MODEL: "not-a-model" });
    const exit = await Effect.runPromiseExit(createScanSvc(env, "acme", input, NO_SPEND));

    expect(Exit.isFailure(exit) && Cause.isDie(exit.cause)).toBe(true);
  });

  it("refuses a scan that could pass the monthly budget", async () => {
    const { env } = fakeBindings();
    const spend = { ...NO_SPEND, spentUsd: 19 };
    const error = await Effect.runPromise(Effect.flip(createScanSvc(env, "acme", input, spend)));

    expect(error).toMatchObject({ _tag: "RateLimited", code: "MONTHLY_BUDGET_EXCEEDED" });
  });

  it("lets a scan through when its cap still fits the budget", async () => {
    const { env } = fakeBindings();
    const spend = { ...NO_SPEND, spentUsd: 17 };
    const queued = await Effect.runPromise(createScanSvc(env, "acme", input, spend));

    expect(queued.status).toBe("queued");
  });

  it("uses the account's own budget when it has one", async () => {
    const { env } = fakeBindings();
    const spend = { ...NO_SPEND, spentUsd: 19, budgetOverrideUsd: 100 };
    const queued = await Effect.runPromise(createScanSvc(env, "acme", input, spend));

    expect(queued.status).toBe("queued");
  });
});

describe("detailScanSvc", () => {
  it("fails with NotFound for a scan that does not exist", async () => {
    const error = await Effect.runPromise(Effect.flip(detailScanSvc(fakeBindings().env, "acme", "none")));

    expect(error._tag).toBe("NotFound");
  });

  it("fails with ExternalError when storage rejects", async () => {
    // SAFETY: the service calls only get on the bucket.
    const { env } = fakeBindings({ REPORTS: { get: down } as never });
    const error = await Effect.runPromise(Effect.flip(detailScanSvc(env, "acme", "abc")));

    expect(error._tag).toBe("ExternalError");
  });

  it("keeps the saved status when the workflow lookup fails", async () => {
    // SAFETY: the service calls only get on the workflow.
    const { env } = fakeBindings({ SCAN_WORKFLOW: { create: async () => undefined, get: down } as never });
    const queued = await Effect.runPromise(createScanSvc(env, "acme", input, NO_SPEND));
    const status = await Effect.runPromise(detailScanSvc(env, "acme", queued.scanId));

    expect(status.status).toBe("queued");
  });
});

describe("readScanFileSvc", () => {
  it("fails with NotFound for a file that was not saved", async () => {
    const error = await Effect.runPromise(Effect.flip(readScanFileSvc(fakeBindings().env.REPORTS, "acme", "abc", "REPORT.md")));

    expect(error._tag).toBe("NotFound");
  });
});
