import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { fakeBindings } from "#/__tests__/fake-bindings";
import type { ScanParams } from "#/schemas";
import { buildScanRecordSvc, readGivenSvc, recordScanSvc } from "#/modules/scan-records";

const ACCOUNT = "0b8c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4";
const REPO_ID = "5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6";
const fp = (letter: string) => letter.repeat(64);
const NO_HISTORY = { history: new Map(), triage: new Map(), given: [] };
const BRANCH_ID = "7c2d1e90-4b5a-4c6d-8e7f-9a0b1c2d3e4f";
const BRANCH = { id: BRANCH_ID, name: "main", reason: null };
const NO_BRANCH = { id: null, name: null, reason: '"v1.2.0" is a tag or a commit, not a branch, so this scan has no History' };

const params: ScanParams = {
  scanId: "scan-1",
  accountId: ACCOUNT,
  repo: "https://github.com/octocat/Hello-World",
  options: { skill: "lite", model: "claude-haiku-5-5", effort: "low", profile: "quick", maxBudgetUsd: 1 },
  createdAt: "2026-11-07T00:00:00.000Z",
};

const findingsJson = JSON.stringify([
  {
    id: "F-001",
    status: "confirmed",
    severity: "high",
    title: "Missing owner check",
    class: "authz",
    location: [{ file: "src/routes/user.ts", line: 42 }],
    actor: "a user of tenant A",
    impact: "reads tenant B data",
    evidence: "the query has no tenant filter",
    fix: "add the tenant filter",
    needs: null,
  },
  { id: "F-002", status: "needs_validation", severity: null, title: "Proxy may strip the header", class: "config", location: [], needs: "the proxy config" },
]);

const reportsWith = (findings?: string) => {
  const bindings = fakeBindings();
  if (findings !== undefined) bindings.store.set(`accounts/${ACCOUNT}/scans/scan-1/findings.json`, findings);
  return bindings.env.REPORTS;
};

describe("buildScanRecordSvc", () => {
  it("builds the scan row and one row per finding", async () => {
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(findingsJson), params, REPO_ID, BRANCH, "succeeded", null, null, NO_HISTORY));

    expect(record.scan).toMatchObject({
      id: "scan-1",
      tenantId: ACCOUNT,
      status: "succeeded",
      skill: "lite",
      model: "claude-haiku-5-5",
      maxBudgetUsd: "1.00",
      error: null,
    });
    expect(record.scan.finishedAt).toBeInstanceOf(Date);
    expect(record.findings).toHaveLength(2);
    expect(record.findings[0]).toMatchObject({ findingId: "F-001", severity: "high", file: "src/routes/user.ts", line: 42 });
    expect(record.findings[0].fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it("gives a needs_validation finding no severity and no file", async () => {
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(findingsJson), params, REPO_ID, BRANCH, "succeeded", null, null, NO_HISTORY));

    expect(record.findings[1]).toMatchObject({ findingId: "F-002", status: "needs_validation", severity: null, file: null, line: null });
  });

  it("records what the agent spent on the scan row", async () => {
    const usage = { inputTokens: 1200, outputTokens: 5400, cacheReadTokens: 250000, cacheWriteTokens: 31000, costUsd: 0.4132, turns: 14, durationMs: 91000 };
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(findingsJson), params, REPO_ID, BRANCH, "succeeded", null, usage, NO_HISTORY));

    expect(record.scan).toMatchObject({
      inputTokens: 1200,
      outputTokens: 5400,
      cacheReadTokens: 250000,
      cacheWriteTokens: 31000,
      costUsd: "0.4132",
      turns: 14,
      durationMs: 91000,
    });
  });

  it("leaves the spend empty when the agent reported none", async () => {
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(findingsJson), params, REPO_ID, BRANCH, "succeeded", null, null, NO_HISTORY));

    expect(record.scan).toMatchObject({ inputTokens: null, costUsd: null });
  });

  it("records a failed scan with its error and no findings", async () => {
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(findingsJson), params, REPO_ID, BRANCH, "failed", "boom", null, NO_HISTORY));

    expect(record.scan).toMatchObject({ status: "failed", error: "boom" });
    expect(record.findings).toEqual([]);
  });

  it("records no findings for the full skill, whose findings.json has another shape", async () => {
    const full = { ...params, options: { ...params.options, skill: "full" as const } };
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(findingsJson), full, REPO_ID, BRANCH, "succeeded", null, null, NO_HISTORY));

    expect(record.findings).toEqual([]);
  });

  it("records no findings when findings.json is missing", async () => {
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(), params, REPO_ID, BRANCH, "succeeded", null, null, NO_HISTORY));

    expect(record.findings).toEqual([]);
  });

  it("fails with ParseError when findings.json is not valid", async () => {
    const error = await Effect.runPromise(Effect.flip(buildScanRecordSvc(reportsWith("{ not json"), params, REPO_ID, BRANCH, "succeeded", null, null, NO_HISTORY)));

    expect(error._tag).toBe("ParseError");
  });

  it("fails with ParseError when a confirmed finding has no severity", async () => {
    const bad = JSON.stringify([{ id: "F-001", status: "confirmed", severity: null, title: "x", class: "authz" }]);
    const error = await Effect.runPromise(Effect.flip(buildScanRecordSvc(reportsWith(bad), params, REPO_ID, BRANCH, "succeeded", null, null, NO_HISTORY)));

    expect(error._tag).toBe("ParseError");
  });

  it("fails with ExternalError when storage rejects", async () => {
    // SAFETY: the service calls only get on the bucket.
    const reports = { get: async () => Promise.reject(new Error("r2 down")) } as never;
    const error = await Effect.runPromise(Effect.flip(buildScanRecordSvc(reports, params, REPO_ID, BRANCH, "succeeded", null, null, NO_HISTORY)));

    expect(error._tag).toBe("ExternalError");
  });
});

describe("a scan of a tracked branch", () => {
  it("names its branch on the scan row and stamps the history with it", async () => {
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(findingsJson), params, REPO_ID, BRANCH, "succeeded", null, null, NO_HISTORY));

    expect(record.scan).toMatchObject({ branch: "main", branchId: BRANCH_ID, untrackedReason: null, priorsGiven: 0 });
    expect(record.history).toHaveLength(2);
    expect(record.history.every((row) => row.branchId === BRANCH_ID)).toBe(true);
  });

  it("does not move the history when it failed", async () => {
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(findingsJson), params, REPO_ID, BRANCH, "failed", "boom", null, NO_HISTORY));

    expect(record.history).toEqual([]);
  });
});

describe("recordScanSvc", () => {
  it("does nothing, and does not fail, when DATABASE_URL is not set", async () => {
    const { env } = fakeBindings({ DATABASE_URL: "" });

    await expect(Effect.runPromise(recordScanSvc(env, params, "succeeded", null, null))).resolves.toBeUndefined();
  });
});

describe("a scan with no tracked branch", () => {
  it("records its findings but moves no history and counts no priors", async () => {
    const ref: ScanParams = { ...params, ref: "v1.2.0" };
    const record = await Effect.runPromise(
      buildScanRecordSvc(reportsWith(findingsJson), ref, REPO_ID, NO_BRANCH, "succeeded", null, null, { history: new Map(), triage: new Map(), given: [{ priorId: fp("a"), status: "confirmed", severity: "high", title: "t", class: "authz", file: "src/a.ts", line: 1 }] }),
    );

    expect(record.findings).toHaveLength(2);
    expect(record.findings.every((row) => row.origin === "new")).toBe(true);
    expect(record.history).toEqual([]);
    expect(record.scan).toMatchObject({ ref: "v1.2.0", branch: null, branchId: null, untrackedReason: NO_BRANCH.reason, priorsGiven: null, priorsCarried: null });
  });
});

describe("readGivenSvc", () => {
  const prior = { priorId: fp("a"), status: "confirmed", severity: "high", title: "t", class: "authz", file: "src/a.ts", line: 1 };
  const reportsHolding = (content?: string) => {
    const bindings = fakeBindings();
    if (content !== undefined) bindings.store.set(`accounts/${ACCOUNT}/scans/scan-1/prior-findings.json`, content);
    return bindings.env.REPORTS;
  };

  it("returns the list that was saved when the scan launched, and none when nothing was saved", async () => {
    expect(await Effect.runPromise(readGivenSvc(reportsHolding(JSON.stringify([prior])), params))).toEqual([prior]);
    expect(await Effect.runPromise(readGivenSvc(reportsHolding(), params))).toEqual([]);
  });

  it("fails on a saved list it cannot read, so a retry reads it again instead of judging against nothing", async () => {
    const error = await Effect.runPromise(Effect.flip(readGivenSvc(reportsHolding("{ not json"), params)));

    expect(error._tag).toBe("ExternalError");
  });
});
