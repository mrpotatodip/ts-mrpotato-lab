import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { scanFindings, scanRepoBranches, scanRunnerJobs, scans, tenantRunners } from "@repo/db-elise/schema";
import { LIVE_FINDINGS_PER_SCAN_MAX, LiveFindingsSavedSchema, RepoFindingListSchema, type RunnerIdentity, type SaveLiveFindingsBody } from "@repo/contracts/elise";
import { fakeBindings, testExecutionContext } from "#/__tests__/fake-bindings";
import { asTenant, openTestDb, scanValues, seedRepo, seedTenant, type TestDb } from "#/__tests__/test-db";
import { callAs, tenantRouteApp } from "#/__tests__/tenant-route-harness";
import { sha256Hex } from "@repo/db-elise";
import { findingRepoIdEffect } from "#/modules/findings/queries";
import { stopScanEffect, tenantScanRepo } from "#/modules/scan-ledger";
import { summaryOf } from "#/modules/scan-ledger/utils";
import { commitEvidenceEffect } from "#/modules/verdict/queries";
import { buildScanRecordSvc, writeScanRecordEffect } from "#/modules/scan-records";
import type { ScanParams } from "#/schemas";
import { z } from "zod";

const RUNNER_TOKEN = "live-runner-token";
const OTHER_RUNNER_TOKEN = "live-other-runner-token";
const NOW = "2026-11-22T09:00:00.000Z";
const EVIDENCE = [{ file: "src/a.ts", line: 3, description: "no tenant filter" }];

const SavedEnvelope = z.object({ data: LiveFindingsSavedSchema });
const FindingsEnvelope = z.object({ data: z.object({ findings: z.array(z.object({ findingId: z.string() })) }) });

let test: TestDb;
let tenantId: string;
let runner: RunnerIdentity;
let otherRunner: RunnerIdentity;
let counter = 0;

const identities = new Map<string, () => RunnerIdentity>([
  [RUNNER_TOKEN, () => runner],
  [OTHER_RUNNER_TOKEN, () => otherRunner],
]);
const app = tenantRouteApp(() => test, { runnerIdentity: async (_c, token) => identities.get(token)?.() ?? null });

const confirmed = (id: string, title = "Missing filter") => ({
  verdict: "confirmed" as const,
  fingerprint: id,
  title,
  description: "reads another tenant's data",
  severity: { overall_severity: "high" as const },
  evidence: EVIDENCE,
  remediation: { strategy: "add the filter" },
});
const needsValidation = (id: string) => ({ verdict: "needs_validation" as const, fingerprint: id, title: "Maybe", description: "unclear", evidence: EVIDENCE, validation_plan: { local: "run it" } });

const post = (scanId: string, body: SaveLiveFindingsBody, token = RUNNER_TOKEN) => {
  const { env } = fakeBindings();
  const headers = new Headers({ authorization: `Bearer ${token}`, "content-type": "application/json" });
  return app.fetch(new Request(`http://localhost/runners/jobs/${scanId}/findings`, { method: "POST", headers, body: JSON.stringify(body) }), env, testExecutionContext);
};

const rowsOf = async (scanId: string) => (await test.raw.select().from(scanFindings).where(eq(scanFindings.scanId, scanId))).toSorted((a, b) => a.findingId.localeCompare(b.findingId));
const statusOf = async (scanId: string) => (await test.raw.select({ status: scans.status }).from(scans).where(eq(scans.id, scanId)))[0]?.status;

const pairRunner = async (accountId: string, partyId: string, name: string): Promise<RunnerIdentity> => {
  const [row] = await test.raw.insert(tenantRunners).values({ tenantId: accountId, name, createdBy: partyId, tokenHash: `hash-${name}` }).returning();
  return { runnerId: row.id, name, accountId, accountName: "acme" };
};

const runnerScan = async (over: Partial<typeof scans.$inferInsert> = {}) => {
  counter += 1;
  const scanId = `live-scan-${counter}`;
  const repoId = await seedRepo(test, tenantId, `https://github.com/octocat/live-${counter}`);
  await test.raw.insert(scans).values(scanValues(tenantId, repoId, scanId, NOW, { status: "running", step: "auditing", skill: "full", ...over }));
  await test.raw.insert(scanRunnerJobs).values({ scanId, tenantId, runnerId: runner.runnerId, state: "claimed", repoUrl: "https://github.com/octocat/Hello-World", prompt: "audit", optionsJson: "{}", priorsJson: "" });
  return { scanId, repoId };
};

beforeAll(async () => {
  test = await openTestDb();
  const own = await seedTenant(test, "live-own");
  const other = await seedTenant(test, "live-other");
  tenantId = own.tenantId;
  runner = await pairRunner(tenantId, own.partyId, "laptop");
  otherRunner = await pairRunner(other.tenantId, other.partyId, "theirs");
});

afterAll(async () => {
  await test.close();
});

describe("POST /runners/jobs/:scanId/findings", () => {
  it("keeps one row for each fingerprint: a repeat batch adds none and a later record replaces the earlier", async () => {
    const { scanId } = await runnerScan();
    await post(scanId, { findings: [confirmed("A"), needsValidation("B")] });
    const repeat = SavedEnvelope.parse(await (await post(scanId, { findings: [confirmed("A", "Renamed"), confirmed("A", "Renamed twice")] })).json());
    const rows = await rowsOf(scanId);

    expect(repeat.data).toEqual({ accepted: 1, dropped: 1 });
    expect(rows.map((row) => [row.findingId, row.status, row.title])).toEqual([
      ["A", "confirmed", "Renamed twice"],
      ["B", "needs_validation", "Maybe"],
    ]);
  });

  it.each(["succeeded", "failed", "stopped", "queued"] as const)("answers a conflict and writes nothing for a %s Scan", async (status) => {
    const { scanId } = await runnerScan({ status });
    const res = await post(scanId, { findings: [confirmed("A")] });

    expect(res.status).toBe(409);
    expect(await rowsOf(scanId)).toHaveLength(0);
  });

  it("answers not found for another Runner's job and for an unknown Scan", async () => {
    const { scanId } = await runnerScan();
    const theirs = await post(scanId, { findings: [confirmed("A")] }, OTHER_RUNNER_TOKEN);
    const unknown = await post("no-such-scan", { findings: [confirmed("A")] });

    expect([theirs.status, unknown.status]).toEqual([404, 404]);
    expect(await rowsOf(scanId)).toHaveLength(0);
  });

  it("keeps the valid records of a batch and counts a malformed one as dropped", async () => {
    const { scanId } = await runnerScan();
    const bad = { verdict: "confirmed", fingerprint: "BAD", title: "no severity" };
    const res = SavedEnvelope.parse(await (await post(scanId, { findings: [confirmed("A"), bad, needsValidation("B")] })).json());

    expect(res.data).toEqual({ accepted: 2, dropped: 1 });
    expect((await rowsOf(scanId)).map((row) => row.findingId)).toEqual(["A", "B"]);
  });

  it("drops a new fingerprint past the per-Scan cap but still updates one it holds", async () => {
    const { scanId } = await runnerScan();
    const seeded = Array.from({ length: LIVE_FINDINGS_PER_SCAN_MAX }, (_, n) => ({
      tenantId,
      scanId,
      findingId: `seed-${n}`,
      fingerprint: `fp-${n}`,
      status: "needs_validation" as const,
      title: "seeded",
      class: "full-audit",
    }));
    for (let at = 0; at < seeded.length; at += 250) await test.raw.insert(scanFindings).values(seeded.slice(at, at + 250));
    const res = SavedEnvelope.parse(await (await post(scanId, { findings: [needsValidation("seed-0"), needsValidation("fresh")] })).json());

    expect(res.data).toEqual({ accepted: 1, dropped: 1 });
    expect((await rowsOf(scanId)).some((row) => row.findingId === "fresh")).toBe(false);
  });
});

describe("a running Scan's live rows", () => {
  it("count in the Scan's summary", async () => {
    const { scanId } = await runnerScan();
    await post(scanId, { findings: [confirmed("A"), needsValidation("B")] });
    const [row] = await test.raw.select().from(scans).where(eq(scans.id, scanId));
    const counts = (await rowsOf(scanId)).map(({ status, severity, origin }) => ({ status, severity, origin, total: 1 }));

    expect(summaryOf(row, counts)).toMatchObject({ total: 2, needsValidation: 1, severity: { high: 1 } });
  });

  it("cannot be triaged or commented on", async () => {
    const { scanId } = await runnerScan();
    await post(scanId, { findings: [confirmed("LIVE-ONLY-3")] });
    const [{ repo }] = await test.raw.select({ repo: scans.repo }).from(scans).where(eq(scans.id, scanId));
    const fingerprint = await sha256Hex("LIVE-ONLY-3");
    const triage = await callAs(app, tenantId, "/findings/triage", { method: "PUT", body: { repo, fingerprint, status: "false_positive" } });
    const owner = await Effect.runPromise(findingRepoIdEffect(test.http, tenantId, repo, fingerprint));

    expect(triage.status).toBe(404);
    expect(owner).toBeNull();
  });
});

describe("the end of a Scan", () => {
  it("replaces every live row with the final records", async () => {
    const { scanId, repoId } = await runnerScan();
    await post(scanId, { findings: [confirmed("A"), confirmed("GONE")] });
    const params: ScanParams = { scanId, accountId: tenantId, repo: "https://github.com/octocat/Hello-World", options: { skill: "full", model: "claude-sonnet-5-5", effort: "high", profile: "quick", maxBudgetUsd: 2 }, keySource: "account", createdAt: NOW };
    const bindings = fakeBindings();
    bindings.store.set(`accounts/${tenantId}/scans/${scanId}/findings.json`, JSON.stringify([confirmed("A", "Final"), needsValidation("NEW")]));
    const record = await Effect.runPromise(buildScanRecordSvc(bindings.env.REPORTS, params, repoId, { id: null, name: null, reason: null }, "succeeded", null, null));
    await Effect.runPromise(writeScanRecordEffect(test.http, record));

    expect((await rowsOf(scanId)).map((row) => [row.findingId, row.title])).toEqual([
      ["A", "Final"],
      ["NEW", "Maybe"],
    ]);
  });

  it("clears the rows of a Stopped Scan", async () => {
    const { scanId } = await runnerScan();
    await post(scanId, { findings: [confirmed("A")] });
    await Effect.runPromise(stopScanEffect(test.http, tenantId, scanId, new Date(NOW)));

    expect(await statusOf(scanId)).toBe("stopped");
    expect(await rowsOf(scanId)).toHaveLength(0);
  });

  it("clears the rows of a failed Scan", async () => {
    const { scanId } = await runnerScan();
    await post(scanId, { findings: [confirmed("A")] });
    await asTenant(test, tenantId, (db) => Effect.runPromise(tenantScanRepo(db).mark(tenantId, scanId, { status: "failed", error: "boom" })));

    expect(await statusOf(scanId)).toBe("failed");
    expect(await rowsOf(scanId)).toHaveLength(0);
  });
});

describe("what ignores a running Scan's rows", () => {
  it("keeps them out of the Findings page, a Branch's findings and a Verdict's evidence", async () => {
    const { scanId, repoId } = await runnerScan({ commitSha: "c0ffee", ref: null });
    const [branch] = await test.raw.select().from(scanRepoBranches).where(and(eq(scanRepoBranches.repoId, repoId), eq(scanRepoBranches.name, "main")));
    await test.raw.update(scans).set({ branchId: branch.id, branch: "main" }).where(eq(scans.id, scanId));
    await post(scanId, { findings: [confirmed("LIVE-ONLY-1"), needsValidation("LIVE-ONLY-2")] });

    const page = FindingsEnvelope.parse(await (await callAs(app, tenantId, "/findings")).json());
    const onBranch = z.object({ data: RepoFindingListSchema }).parse(await (await callAs(app, tenantId, `/repos/${repoId}/findings`)).json());
    const evidence = await Effect.runPromise(commitEvidenceEffect(test.http, tenantId, repoId, "c0ffee"));

    expect(await rowsOf(scanId)).toHaveLength(2);
    expect(page.data.findings.map((finding) => finding.findingId)).not.toContain("LIVE-ONLY-1");
    expect(onBranch.data.findings).toEqual([]);
    expect(evidence).toEqual({ scans: [], findings: [], triage: [] });
  });
});
