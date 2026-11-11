import { Cause, Effect, Exit } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { fakeBindings } from "#/__tests__/fake-bindings";
import { brokenScanRepo, memoryScanRepo } from "#/__tests__/memory-scan-repo";
import { ExternalError } from "#/lib/effect-query";
import type { PlanState } from "#/modules/billing";
import type { GithubAccess } from "#/modules/github-installs";
import type { ScanRepo } from "#/modules/scan-ledger";
import type { MonthSpend } from "#/modules/usage";
import { createScanSvc, detailScanSvc, readScanFileSvc } from "#/modules/scans/handlers";
import type { CreateScanBody } from "#/modules/scans/schemas";

const input: CreateScanBody = { repo: "https://github.com/octocat/Hello-World" };

const down = async () => {
  throw new Error("down");
};

const NO_SPEND: MonthSpend = { spentUsd: 0, scans: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, budgetOverrideUsd: null, budgetAllowanceUsd: null, platformSpentUsd: 0, platformReservedUsd: 0, ownKey: false, plan: null };

let repo: ScanRepo;

beforeEach(() => {
  repo = memoryScanRepo().repo;
});

describe("createScanSvc", () => {
  it("queues a scan with the defaults", async () => {
    const { env, created } = fakeBindings();
    const queued = await Effect.runPromise(createScanSvc(env, repo, "acme", input, NO_SPEND));

    expect(queued).toMatchObject({ status: "queued", skill: "lite", profile: "quick", model: "claude-sonnet-5-5", maxBudgetUsd: 2 });
    expect(created).toHaveLength(1);
  });

  it("records the scan in the ledger before the workflow starts", async () => {
    const { env } = fakeBindings();
    const queued = await Effect.runPromise(createScanSvc(env, repo, "acme", input, NO_SPEND));

    expect(await Effect.runPromise(repo.get("acme", queued.scanId))).toMatchObject({ status: "queued", repo: input.repo, step: null });
  });

  it("marks the scan failed when the workflow cannot start", async () => {
    // SAFETY: the service calls only create on the workflow.
    const { env } = fakeBindings({ SCAN_WORKFLOW: { create: down } as never });
    await Effect.runPromise(Effect.flip(createScanSvc(env, repo, "acme", input, NO_SPEND)));
    const [scan] = (await Effect.runPromise(repo.list("acme", 10))).scans;

    expect(scan).toMatchObject({ status: "failed" });
    expect(scan.error).toContain("could not start the workflow");
  });

  it("starts the workflow with the install GitHub access chose, asked for under the repo's own spelling", async () => {
    const { env, created } = fakeBindings();
    const asked: string[] = [];
    const github = { installationRowId: "7c1e4a52-9d3b-4f60-8a71-2b3c4d5e6f70", installationId: 42, repoId: 7, repo: "octocat/hello-world", isPrivate: true };
    const access: GithubAccess = { forRepo: (url) => Effect.sync(() => (asked.push(url), github)) };

    await Effect.runPromise(createScanSvc(env, repo, "acme", { repo: "https://github.com/octocat/Hello-World.git" }, NO_SPEND, access));

    expect(asked).toEqual(["https://github.com/octocat/Hello-World"]);
    expect(created[0]?.params.github).toEqual(github);
  });

  it("starts the workflow with no install when GitHub access has none", async () => {
    const { env, created } = fakeBindings();
    const access: GithubAccess = { forRepo: () => Effect.succeed(null) };

    await Effect.runPromise(createScanSvc(env, repo, "acme", input, NO_SPEND, access));

    expect(created[0]?.params.github).toBeUndefined();
  });

  it("queues nothing when GitHub access fails", async () => {
    const { env, created } = fakeBindings();
    const access: GithubAccess = { forRepo: () => Effect.fail(new ExternalError({ cause: "down" })) };

    const error = await Effect.runPromise(Effect.flip(createScanSvc(env, repo, "acme", input, NO_SPEND, access)));

    expect(error._tag).toBe("ExternalError");
    expect(created).toHaveLength(0);
    expect((await Effect.runPromise(repo.list("acme", 10))).scans).toEqual([]);
  });

  it("fails with DbError when the ledger is down", async () => {
    const error = await Effect.runPromise(Effect.flip(createScanSvc(fakeBindings().env, brokenScanRepo, "acme", input, NO_SPEND)));

    expect(error._tag).toBe("DbError");
  });

  it("fails with Invalid when the dollar cap is above the ceiling", async () => {
    const error = await Effect.runPromise(Effect.flip(createScanSvc(fakeBindings().env, memoryScanRepo().repo, "acme", { ...input, max_budget_usd: 5 }, NO_SPEND)));

    expect(error._tag).toBe("Invalid");
  });

  it("fails with RateLimited at the active scan limit", async () => {
    const { env } = fakeBindings({ MAX_ACTIVE_SCANS: "1" });
    await Effect.runPromise(createScanSvc(env, repo, "acme", input, NO_SPEND));
    const error = await Effect.runPromise(Effect.flip(createScanSvc(env, repo, "acme", input, NO_SPEND)));

    expect(error).toMatchObject({ _tag: "RateLimited", code: "TOO_MANY_ACTIVE_SCANS" });
  });

  it("fails with ExternalError when the workflow cannot start", async () => {
    // SAFETY: the service calls only create on the workflow.
    const { env } = fakeBindings({ SCAN_WORKFLOW: { create: down } as never });
    const error = await Effect.runPromise(Effect.flip(createScanSvc(env, repo, "acme", input, NO_SPEND)));

    expect(error._tag).toBe("ExternalError");
  });

  it("dies, and does not fail, when the default model in the config is not on the list", async () => {
    const { env } = fakeBindings({ MODEL: "not-a-model" });
    const exit = await Effect.runPromiseExit(createScanSvc(env, repo, "acme", input, NO_SPEND));

    expect(Exit.isFailure(exit) && Cause.isDie(exit.cause)).toBe(true);
  });

  it("refuses a scan that could pass the monthly budget", async () => {
    const { env } = fakeBindings();
    const spend = { ...NO_SPEND, spentUsd: 19 };
    const error = await Effect.runPromise(Effect.flip(createScanSvc(env, memoryScanRepo().repo, "acme", input, spend)));

    expect(error).toMatchObject({ _tag: "RateLimited", code: "MONTHLY_BUDGET_EXCEEDED" });
  });

  it("lets a scan through when its cap still fits the budget", async () => {
    const { env } = fakeBindings();
    const spend = { ...NO_SPEND, spentUsd: 17 };
    const queued = await Effect.runPromise(createScanSvc(env, memoryScanRepo().repo, "acme", input, spend));

    expect(queued.status).toBe("queued");
  });

  it("uses the account's own budget when it has one", async () => {
    const { env } = fakeBindings();
    const spend = { ...NO_SPEND, spentUsd: 19, budgetOverrideUsd: 100 };
    const queued = await Effect.runPromise(createScanSvc(env, memoryScanRepo().repo, "acme", input, spend));

    expect(queued.status).toBe("queued");
  });
});

const TEAM: PlanState = { planKey: "team", includedCreditUsd: 50, maxMembers: 10, status: "active", pastDueSince: null };
const DAY = 24 * 60 * 60 * 1000;
const onPlan = (plan: Partial<PlanState>, rest: Partial<MonthSpend> = {}): MonthSpend => ({ ...NO_SPEND, plan: { ...TEAM, ...plan }, ...rest });

describe("createScanSvc: the plan", () => {
  const outcome = (spend: MonthSpend, enforced: string) => {
    const { env } = fakeBindings({ BILLING_ENFORCED: enforced });
    return Effect.runPromise(
      createScanSvc(env, memoryScanRepo().repo, "acme", input, spend).pipe(
        Effect.match({ onSuccess: () => "queued", onFailure: (failure) => (failure._tag === "RateLimited" ? failure.code : failure._tag) }),
      ),
    );
  };

  it.each([
    ["no plan, billing not enforced", NO_SPEND, "false", "queued"],
    ["no plan, billing enforced", NO_SPEND, "true", "NO_ACTIVE_PLAN"],
    ["an active plan", onPlan({}), "true", "queued"],
    ["a canceled plan", onPlan({ status: "canceled" }), "false", "NO_ACTIVE_PLAN"],
    ["a past due plan inside the grace period", onPlan({ status: "past_due", pastDueSince: new Date(Date.now() - 3 * DAY) }), "true", "queued"],
    ["a past due plan after the grace period", onPlan({ status: "past_due", pastDueSince: new Date(Date.now() - 8 * DAY) }), "true", "PAYMENT_FAILED"],
    ["an unpaid plan", onPlan({ status: "unpaid" }), "true", "PAYMENT_FAILED"],
  ])("with %s the scan is %s", async (_name, spend, enforced, expected) => {
    expect(await outcome(spend, enforced)).toBe(expected);
  });

  it.each([
    ["the platform's key with credit left", onPlan({}, { platformSpentUsd: 40, spentUsd: 40 }), "queued"],
    ["the platform's key with the credit used", onPlan({}, { platformSpentUsd: 49, spentUsd: 49, budgetOverrideUsd: 100 }), "PLATFORM_CREDIT_EXCEEDED"],
    ["the platform's key with the credit held by running scans", onPlan({}, { platformSpentUsd: 40, platformReservedUsd: 9, spentUsd: 40, budgetOverrideUsd: 100 }), "PLATFORM_CREDIT_EXCEEDED"],
    ["the account's own key, whatever the platform part is", onPlan({}, { ownKey: true, platformSpentUsd: 49, spentUsd: 49, budgetOverrideUsd: 100 }), "queued"],
    ["the account's own key, but the admin's budget used", onPlan({}, { ownKey: true, spentUsd: 49, budgetOverrideUsd: 50 }), "MONTHLY_BUDGET_EXCEEDED"],
  ])("with %s the scan is %s", async (_name, spend, expected) => {
    expect(await outcome(spend, "true")).toBe(expected);
  });

  it("says in the refusal that an own key is the way out", async () => {
    const { env } = fakeBindings();
    const failure = await Effect.runPromise(Effect.flip(createScanSvc(env, memoryScanRepo().repo, "acme", input, onPlan({}, { platformSpentUsd: 49, spentUsd: 49, budgetOverrideUsd: 100 }))));

    expect(failure).toMatchObject({ message: expect.stringContaining("Add your own Anthropic key") });
  });

  it.each([
    [false, "platform"],
    [true, "account"],
  ])("accepts a scan with an own key of %s to use the %s key", async (ownKey, expected) => {
    const { env, created } = fakeBindings();
    await Effect.runPromise(createScanSvc(env, memoryScanRepo().repo, "acme", input, { ...NO_SPEND, ownKey }));

    expect(created[0].params.keySource).toBe(expected);
  });
});

describe("createScanSvc: the ref", () => {
  const paramsOf = async (ref: string | undefined) => {
    const { env, created } = fakeBindings();
    await Effect.runPromise(createScanSvc(env, memoryScanRepo().repo, "acme", { ...input, ref }, NO_SPEND));
    return created[0].params;
  };

  it("keeps a branch, a tag and a commit as they were typed, and leaves it to the clone to tell which", async () => {
    expect((await paramsOf("release")).ref).toBe("release");
    expect((await paramsOf("v1.0.0")).ref).toBe("v1.0.0");
    expect((await paramsOf("7495881".padEnd(40, "a"))).ref).toBe("7495881".padEnd(40, "a"));
  });

  it("reads refs/heads/release as release, and knows Release is not release", async () => {
    expect((await paramsOf("refs/heads/release")).ref).toBe("release");
    expect((await paramsOf("Release")).ref).toBe("Release");
  });

  it("takes HEAD, and no ref, as a plain scan of the default branch", async () => {
    expect((await paramsOf("HEAD")).ref).toBeUndefined();
    expect((await paramsOf(undefined)).ref).toBeUndefined();
  });
});

describe("detailScanSvc", () => {
  it("fails with NotFound for a scan that does not exist", async () => {
    const error = await Effect.runPromise(Effect.flip(detailScanSvc(fakeBindings().env, repo, "acme", "none")));

    expect(error._tag).toBe("NotFound");
  });

  it("fails with DbError when the ledger is down", async () => {
    const error = await Effect.runPromise(Effect.flip(detailScanSvc(fakeBindings().env, brokenScanRepo, "acme", "abc")));

    expect(error._tag).toBe("DbError");
  });

  it("keeps the saved status when the workflow lookup fails", async () => {
    // SAFETY: the service calls only create and get on the workflow.
    const { env } = fakeBindings({ SCAN_WORKFLOW: { create: async () => undefined, get: down } as never });
    const queued = await Effect.runPromise(createScanSvc(env, repo, "acme", input, NO_SPEND));
    const status = await Effect.runPromise(detailScanSvc(env, repo, "acme", queued.scanId));

    expect(status.status).toBe("queued");
  });

  it("lists the files a scan saved, with their sizes", async () => {
    const { env } = fakeBindings();
    const queued = await Effect.runPromise(createScanSvc(env, repo, "acme", input, NO_SPEND));
    await Effect.runPromise(
      repo.addFiles("acme", queued.scanId, [{ name: "REPORT.md", r2Key: "k", sizeBytes: 7, contentType: "text/markdown; charset=utf-8" }]),
    );
    const status = await Effect.runPromise(detailScanSvc(env, repo, "acme", queued.scanId));

    expect(status).toMatchObject({ files: ["REPORT.md"], artifacts: [{ name: "REPORT.md", sizeBytes: 7 }] });
  });
});

describe("readScanFileSvc", () => {
  it("fails with NotFound for a file the ledger does not list", async () => {
    const error = await Effect.runPromise(Effect.flip(readScanFileSvc(fakeBindings().env.REPORTS, repo, "acme", "abc", "REPORT.md")));

    expect(error._tag).toBe("NotFound");
  });

  it("fails with NotFound when the ledger lists a file that R2 lost", async () => {
    await Effect.runPromise(
      repo.addFiles("acme", "abc", [{ name: "REPORT.md", r2Key: "accounts/acme/scans/abc/REPORT.md", sizeBytes: 1, contentType: "text/markdown; charset=utf-8" }]),
    );
    const error = await Effect.runPromise(Effect.flip(readScanFileSvc(fakeBindings().env.REPORTS, repo, "acme", "abc", "REPORT.md")));

    expect(error._tag).toBe("NotFound");
  });

  it("fails with NotFound for a key outside the account's prefix, even when R2 holds it", async () => {
    const { env, store } = fakeBindings();
    store.set("accounts/other/scans/abc/REPORT.md", "# theirs");
    await Effect.runPromise(
      repo.addFiles("acme", "abc", [{ name: "REPORT.md", r2Key: "accounts/other/scans/abc/REPORT.md", sizeBytes: 8, contentType: "text/markdown; charset=utf-8" }]),
    );
    const error = await Effect.runPromise(Effect.flip(readScanFileSvc(env.REPORTS, repo, "acme", "abc", "REPORT.md")));

    expect(error._tag).toBe("NotFound");
  });

  it("returns the bytes with the type the ledger recorded", async () => {
    const { env, store } = fakeBindings();
    store.set("accounts/acme/scans/abc/REPORT.md", "# r");
    await Effect.runPromise(
      repo.addFiles("acme", "abc", [{ name: "REPORT.md", r2Key: "accounts/acme/scans/abc/REPORT.md", sizeBytes: 3, contentType: "text/markdown; charset=utf-8" }]),
    );
    const file = await Effect.runPromise(readScanFileSvc(env.REPORTS, repo, "acme", "abc", "REPORT.md"));

    expect(file.contentType).toBe("text/markdown; charset=utf-8");
  });
});
