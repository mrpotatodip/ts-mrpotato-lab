import { Effect } from "effect";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { authUser, scanRunnerJobs, scans } from "@repo/db-elise";
import { RUNNER_JOB_QUEUE_TIMEOUT_MS } from "@repo/contracts/elise";
import { openTestDb, scanValues, seedRepo, seedTenant, type TestDb } from "#/__tests__/test-db";
import type { ScanOptions, ScanParams } from "#/schemas";
import { claimJobSvc, reportJobSvc } from "#/modules/runners/handlers";
import { runnerSandbox } from "#/modules/runners/lib";
import { neonScanRepo } from "#/modules/scan-ledger";
import { monthSpendEffect } from "#/modules/usage";
import { claimRunnerJobEffect, createRunnerEffect, claimPairingEffect, readRunnerJobEffect, reportRunnerJobEffect } from "#/modules/runners/queries";

let test: TestDb;
let tenantId: string;
let repoId: string;
let userId: string;
let runnerId: string;
let otherRunnerId: string;
let counter = 0;

const NOW = new Date("2026-11-11T09:00:00Z");
const OPTIONS: ScanOptions = { skill: "lite", model: "claude-sonnet-5-5", effort: "high", profile: "quick", maxBudgetUsd: 2 };

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

const pair = async (label: string) => {
  const created = await run(createRunnerEffect(test.http, { tenantId, actorUserId: userId, name: label, codeHash: `jobs-code-${label}`, expiresAt: new Date("2026-11-11T10:00:00Z") }));
  await run(claimPairingEffect(test.http, { codeHash: `jobs-code-${label}`, tokenHash: `jobs-token-${label}`, now: NOW }));
  return created.id;
};

const paramsFor = (scanId: string, over: Partial<ScanParams> = {}): ScanParams => ({
  scanId,
  accountId: tenantId,
  repo: "https://github.com/octocat/Hello-World",
  options: OPTIONS,
  keySource: "account",
  runnerId,
  createdAt: NOW.toISOString(),
  ...over,
});

const newScan = async () => {
  counter += 1;
  const scanId = `job-scan-${counter}`;
  await test.raw.insert(scans).values(scanValues(tenantId, repoId, scanId, NOW.toISOString()));
  return scanId;
};

const queue = async (scanId: string, over: Partial<ScanParams> = {}, at = NOW) => {
  await runnerSandbox(test.http, paramsFor(scanId, over), over.runnerId ?? runnerId, () => at).launchAgent(OPTIONS, []);
  return scanId;
};

const report = (scanId: string, body: Parameters<typeof reportJobSvc>[3], by = runnerId) => run(reportJobSvc(test.http, by, scanId, body));
const jobOf = async (scanId: string) => (await run(readRunnerJobEffect(test.http, scanId)))!;

beforeAll(async () => {
  test = await openTestDb();
  const seeded = await seedTenant(test, "jobs-account");
  tenantId = seeded.tenantId;
  userId = crypto.randomUUID();
  await test.raw.insert(authUser).values({ id: userId, name: "Ada", email: "jobs@example.com", emailVerified: true, partyId: seeded.partyId });
  repoId = await seedRepo(test, tenantId);
});

// -----
// A runner of its own for every test, so a job another test left
// queued is never the one this test claims.
// -----
beforeEach(async () => {
  counter += 1;
  runnerId = await pair(`runner-${counter}`);
  otherRunnerId = await pair(`other-${counter}`);
});

afterAll(async () => {
  await test.close();
});

describe("claiming a job", () => {
  it("gives a runner its oldest queued scan once, with the prompt and the options", async () => {
    const first = await queue(await newScan());
    await queue(await newScan());
    const claimed = await run(claimJobSvc(test.http, runnerId));
    const again = await run(claimJobSvc(test.http, runnerId));

    expect(claimed).toMatchObject({ scanId: first, repo: "https://github.com/octocat/Hello-World", ref: null, skill: "lite", model: "claude-sonnet-5-5", maxBudgetUsd: 2 });
    expect(claimed?.prompt).toContain("./repo");
    expect(again?.scanId).not.toBe(first);
  });

  it("fails a job whose options cannot be read and hands over the next one", async () => {
    const broken = await queue(await newScan());
    await test.raw.update(scanRunnerJobs).set({ optionsJson: "not json" }).where(eq(scanRunnerJobs.scanId, broken));
    const next = await queue(await newScan());
    const claimed = await run(claimJobSvc(test.http, runnerId));

    expect(claimed?.scanId).toBe(next);
    expect(await jobOf(broken)).toMatchObject({ state: "failed", error: expect.stringContaining("could not be read") });
  });

  it("keeps a Runner scan's cost estimate out of the month's spend and counts a plain scan's cost", async () => {
    const monthStart = new Date("2026-11-01T00:00:00Z");
    const before = (await run(monthSpendEffect(test.http, tenantId, monthStart))).spentUsd;
    const onRunner = await newScan();
    await test.raw.update(scans).set({ costUsd: "4.0000" }).where(eq(scans.id, onRunner));
    await queue(onRunner);
    counter += 1;
    await test.raw.insert(scans).values(scanValues(tenantId, repoId, `job-plain-${counter}`, NOW.toISOString(), { costUsd: "0.5000" }));
    const after = (await run(monthSpendEffect(test.http, tenantId, monthStart))).spentUsd;

    expect(after - before).toBeCloseTo(0.5);
  });

  it("names the Runner on the scan it ran, and none on a cloud scan", async () => {
    const onRunner = await queue(await newScan());
    const inCloud = await newScan();
    const repo = neonScanRepo(test.http);

    expect(await run(repo.get(tenantId, onRunner))).toMatchObject({ runner: { id: runnerId, name: expect.stringMatching(/^runner-\d+$/) } });
    expect((await run(repo.get(tenantId, inCloud)))?.runner).toBeNull();
  });

  it("cancels the job of a scan that stalled when a newer scan of the repo starts", async () => {
    counter += 1;
    const stalledId = `job-stalled-${counter}`;
    await test.raw.insert(scans).values(scanValues(tenantId, repoId, stalledId, NOW.toISOString(), { status: "running" }));
    await queue(stalledId);
    await run(neonScanRepo(test.http).create(paramsFor(`job-newer-${counter}`, { runnerId: undefined }), repoId, Date.now() + 200 * 60 * 1000));

    expect((await jobOf(stalledId)).state).toBe("cancelled");
  });

  it("gives a runner nothing that was queued for another", async () => {
    await run(claimRunnerJobEffect(test.http, otherRunnerId, NOW));
    await queue(await newScan());

    expect(await run(claimRunnerJobEffect(test.http, otherRunnerId, NOW))).toBeNull();
  });
});

describe("reporting a job", () => {
  const FILES = { "REPORT.md": "# Report", "findings.json": "{}" };
  const AGENT_LOG = JSON.stringify({ total_cost_usd: 1.5, num_turns: 4, duration_ms: 9000, usage: { input_tokens: 10, output_tokens: 20 } });

  const claimed = async (over: Partial<ScanParams> = {}) => {
    const scanId = await queue(await newScan(), over);
    await run(claimRunnerJobEffect(test.http, runnerId, NOW));
    return scanId;
  };

  it("keeps the files, and the usage with the agent's own cost estimate", async () => {
    const scanId = await claimed();
    await report(scanId, { state: "succeeded", agentLog: AGENT_LOG, files: { ...FILES, "notes.txt": "dropped" } });
    const job = await jobOf(scanId);

    expect(job.state).toBe("succeeded");
    expect(JSON.parse(job.filesJson ?? "{}")).toEqual(FILES);
    expect(JSON.parse(job.usageJson ?? "{}")).toMatchObject({ inputTokens: 10, outputTokens: 20, costUsd: 1.5, turns: 4 });
  });

  it("fails a scan that reports success without REPORT.md", async () => {
    const scanId = await claimed();
    await report(scanId, { state: "succeeded", files: { "findings.json": "{}" } });

    expect(await jobOf(scanId)).toMatchObject({ state: "failed", error: "the audit finished without writing REPORT.md" });
  });

  it("keeps the failure the runner reports", async () => {
    const scanId = await claimed();
    await report(scanId, { state: "failed", error: "claude exited 1: not logged in" });

    expect(await jobOf(scanId)).toMatchObject({ state: "failed", error: "claude exited 1: not logged in" });
  });

  it.each([
    ["no ref, HEAD on main", undefined, { commitSha: "a".repeat(40), headBranch: "main", kind: null }, "main"],
    ["no ref, a detached HEAD", undefined, { commitSha: "a".repeat(40), headBranch: "HEAD", kind: null }, null],
    ["a ref fetched as a branch", "release", { commitSha: "a".repeat(40), headBranch: "HEAD", kind: "branch" }, "release"],
    ["a ref that is not a branch", "v1.2.0", { commitSha: "a".repeat(40), headBranch: "HEAD", kind: "other" }, null],
  ] as const)("works out the branch for %s", async (_name, ref, checkout, branch) => {
    const scanId = await claimed({ ref });
    await report(scanId, { state: "succeeded", checkout, files: FILES });

    expect(await jobOf(scanId)).toMatchObject({ commitSha: "a".repeat(40), branch });
  });

  it("refuses a report from a runner that did not claim the scan", async () => {
    const scanId = await claimed();
    const failure = await Effect.runPromise(Effect.flip(reportJobSvc(test.http, otherRunnerId, scanId, { state: "succeeded", files: FILES })));

    expect(failure).toMatchObject({ _tag: "NotFound" });
  });

  it("refuses a second report, and a report for a scan that ended", async () => {
    const scanId = await claimed();
    await report(scanId, { state: "succeeded", files: FILES });
    const second = await Effect.runPromise(Effect.flip(reportJobSvc(test.http, runnerId, scanId, { state: "failed", error: "late" })));

    const cancelledId = await claimed();
    await runnerSandbox(test.http, paramsFor(cancelledId), runnerId, () => NOW).destroy();
    const late = await Effect.runPromise(Effect.flip(reportJobSvc(test.http, runnerId, cancelledId, { state: "succeeded", files: FILES })));

    expect([second._tag, late._tag]).toEqual(["NotFound", "NotFound"]);
    expect((await jobOf(cancelledId)).state).toBe("cancelled");
  });
});

describe("the runner as a sandbox", () => {
  it("shows a scan running while it waits and while it is claimed, and not picked up after ten minutes", async () => {
    const scanId = await queue(await newScan());
    const queuedAt = (await jobOf(scanId)).createdAt.getTime();
    const at = (ms: number) => runnerSandbox(test.http, paramsFor(scanId), runnerId, () => new Date(queuedAt + ms));

    const waiting = await at(1000).pollAgent();
    const late = await at(RUNNER_JOB_QUEUE_TIMEOUT_MS + 1000).pollAgent();
    await run(claimRunnerJobEffect(test.http, runnerId, NOW));
    const claimedLate = await at(RUNNER_JOB_QUEUE_TIMEOUT_MS + 1000).pollAgent();

    expect({ waiting, claimedLate }).toEqual({ waiting: { state: "running" }, claimedLate: { state: "running" } });
    expect(late).toMatchObject({ state: "failed", error: expect.stringContaining("did not pick up") });
  });

  it("hands the Workflow the files, the usage and the commit the runner reported", async () => {
    const scanId = await queue(await newScan());
    await run(claimRunnerJobEffect(test.http, runnerId, NOW));
    await report(scanId, {
      state: "succeeded",
      agentLog: JSON.stringify({ total_cost_usd: 3, usage: { input_tokens: 5 } }),
      checkout: { commitSha: "b".repeat(40), headBranch: "main", kind: null },
      files: { "REPORT.md": "# Report" },
    });
    const sandbox = runnerSandbox(test.http, paramsFor(scanId), runnerId);

    expect(await sandbox.pollAgent()).toEqual({ state: "succeeded" });
    expect(await sandbox.readFiles()).toEqual({ "REPORT.md": "# Report" });
    expect(await sandbox.readUsage()).toMatchObject({ inputTokens: 5, costUsd: 3 });
    expect(await sandbox.readCheckout()).toEqual({ commitSha: "b".repeat(40), branch: "main" });
  });

  it("refuses a private repository before anything is queued", async () => {
    const github = { installationRowId: crypto.randomUUID(), installationId: 1, repoId: 1, repo: "o/n", isPrivate: true };
    const sandbox = runnerSandbox(test.http, paramsFor("job-scan-private", { github }), runnerId);

    await expect(sandbox.prepare("https://github.com/o/n")).rejects.toThrow("private repository");
  });

  it("keeps a Runner scan out of the month's scan count and counts a plain one", async () => {
    const monthStart = new Date("2026-11-01T00:00:00Z");
    const before = (await run(monthSpendEffect(test.http, tenantId, monthStart))).scans;
    await queue(await newScan());
    await newScan();
    const after = (await run(monthSpendEffect(test.http, tenantId, monthStart))).scans;

    expect(after - before).toBe(1);
  });

  it("leaves a finished job as it was when the scan cleans up", async () => {
    const scanId = await queue(await newScan());
    await run(claimRunnerJobEffect(test.http, runnerId, NOW));
    await run(reportRunnerJobEffect(test.http, { scanId, runnerId, state: "succeeded", error: null, commitSha: null, branch: null, usageJson: null, filesJson: "{}", now: NOW }));
    await runnerSandbox(test.http, paramsFor(scanId), runnerId, () => NOW).destroy();

    expect((await jobOf(scanId)).state).toBe("succeeded");
  });
});
