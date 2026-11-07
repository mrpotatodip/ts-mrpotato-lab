import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { fakeBindings } from "#/__tests__/fake-bindings";
import type { ScanParams } from "#/schemas";
import { buildScanRecordSvc, recordScanSvc } from "#/modules/scan-records";

const ACCOUNT = "0b8c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4";

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
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(findingsJson), params, "succeeded", null, null));

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
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(findingsJson), params, "succeeded", null, null));

    expect(record.findings[1]).toMatchObject({ findingId: "F-002", status: "needs_validation", severity: null, file: null, line: null });
  });

  it("records what the agent spent on the scan row", async () => {
    const usage = { inputTokens: 1200, outputTokens: 5400, cacheReadTokens: 250000, cacheWriteTokens: 31000, costUsd: 0.4132, turns: 14, durationMs: 91000 };
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(findingsJson), params, "succeeded", null, usage));

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
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(findingsJson), params, "succeeded", null, null));

    expect(record.scan).toMatchObject({ inputTokens: null, costUsd: null });
  });

  it("records a failed scan with its error and no findings", async () => {
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(findingsJson), params, "failed", "boom", null));

    expect(record.scan).toMatchObject({ status: "failed", error: "boom" });
    expect(record.findings).toEqual([]);
  });

  it("records no findings for the full skill, whose findings.json has another shape", async () => {
    const full = { ...params, options: { ...params.options, skill: "full" as const } };
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(findingsJson), full, "succeeded", null, null));

    expect(record.findings).toEqual([]);
  });

  it("records no findings when findings.json is missing", async () => {
    const record = await Effect.runPromise(buildScanRecordSvc(reportsWith(), params, "succeeded", null, null));

    expect(record.findings).toEqual([]);
  });

  it("fails with ParseError when findings.json is not valid", async () => {
    const error = await Effect.runPromise(Effect.flip(buildScanRecordSvc(reportsWith("{ not json"), params, "succeeded", null, null)));

    expect(error._tag).toBe("ParseError");
  });

  it("fails with ParseError when a confirmed finding has no severity", async () => {
    const bad = JSON.stringify([{ id: "F-001", status: "confirmed", severity: null, title: "x", class: "authz" }]);
    const error = await Effect.runPromise(Effect.flip(buildScanRecordSvc(reportsWith(bad), params, "succeeded", null, null)));

    expect(error._tag).toBe("ParseError");
  });

  it("fails with ExternalError when storage rejects", async () => {
    // SAFETY: the service calls only get on the bucket.
    const reports = { get: async () => Promise.reject(new Error("r2 down")) } as never;
    const error = await Effect.runPromise(Effect.flip(buildScanRecordSvc(reports, params, "succeeded", null, null)));

    expect(error._tag).toBe("ExternalError");
  });
});

describe("recordScanSvc", () => {
  it("does nothing, and does not fail, when DATABASE_URL is not set", async () => {
    const { env } = fakeBindings({ DATABASE_URL: "" });

    await expect(Effect.runPromise(recordScanSvc(env, params, "succeeded", null, null))).resolves.toBeUndefined();
  });
});
