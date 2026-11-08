import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { dbConnect } from "#/lib/db-connection";
import { writeScanRecordEffect } from "#/modules/scan-records/queries";
import type { ScanRecord } from "#/modules/scan-records/types";

const ACCOUNT = "0b8c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4";

const record: ScanRecord = {
  scan: {
    id: "scan-1",
    tenantId: ACCOUNT,
    repo: "https://github.com/octocat/Hello-World",
    repoId: "5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6",
    status: "succeeded",
    skill: "lite",
    model: "claude-haiku-5-5",
    effort: "low",
    profile: "quick",
    maxBudgetUsd: "1.00",
    createdAt: new Date("2026-11-07T00:00:00.000Z"),
    finishedAt: new Date("2026-11-07T00:01:00.000Z"),
  },
  findings: [],
  history: [],
};

describe("writeScanRecordEffect", () => {
  it("fails with DbError when the database cannot be reached", async () => {
    const db = dbConnect("postgresql://user:pass@127.0.0.1:1/none");
    const error = await Effect.runPromise(Effect.flip(writeScanRecordEffect(db, record)));

    expect(error._tag).toBe("DbError");
  });

  it("fails with DbError, with the findings insert included, when the database cannot be reached", async () => {
    const db = dbConnect("postgresql://user:pass@127.0.0.1:1/none");
    const withFinding: ScanRecord = {
      ...record,
      findings: [
        { tenantId: ACCOUNT, scanId: "scan-1", findingId: "F-001", fingerprint: "a".repeat(64), status: "confirmed", severity: "high", title: "t", class: "authz" },
      ],
    };
    const error = await Effect.runPromise(Effect.flip(writeScanRecordEffect(db, withFinding)));

    expect(error._tag).toBe("DbError");
  });
});
