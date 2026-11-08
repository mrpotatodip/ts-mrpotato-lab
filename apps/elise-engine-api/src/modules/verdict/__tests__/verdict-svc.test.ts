import { Effect } from "effect";
import { scanFindings, scanFindingTriage, scans } from "@repo/db-elise/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openTestDb, scanValues, seedRepo, seedTenant, type TestDb } from "#/__tests__/test-db";
import { verdictSvc } from "#/modules/verdict/handlers";

let test: TestDb;
let tenantId: string;
let repoId: string;
let otherTenantId: string;
let otherRepoId: string;

const NOW = new Date("2026-11-10T00:00:00Z");
const COMMIT = "a".repeat(40);
const ELSEWHERE = "b".repeat(40);
const fp = (letter: string) => letter.repeat(64);

const scan = (id: string, day: number, extra: Partial<typeof scans.$inferInsert> = {}) =>
  scanValues(tenantId, repoId, id, `2026-11-0${day}T00:00:00Z`, { commitSha: COMMIT, priorsGiven: 0, priorsUnchecked: 0, ...extra });

const found = (scanId: string, letter: string, severity: "critical" | "high" | "medium" | "low", tenant = tenantId) => ({
  tenantId: tenant,
  scanId,
  findingId: `${scanId}-${letter}`,
  fingerprint: fp(letter),
  status: "confirmed" as const,
  severity,
  title: `problem ${letter}`,
  class: "authz",
});

const run = (commit = COMMIT, repo = repoId, tenant = tenantId) => Effect.runPromise(verdictSvc(test.http, tenant, repo, commit, NOW));

beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
  otherTenantId = (await seedTenant(test, "other")).tenantId;
  repoId = await seedRepo(test, tenantId);
  otherRepoId = await seedRepo(test, otherTenantId);
});

afterAll(async () => {
  await test.close();
});

describe("verdictSvc", () => {
  it("cannot tell for a commit with no scan, and for a repo that is not in the account", async () => {
    expect(await run()).toMatchObject({ verdict: "cannot_tell", reasons: [{ code: "not_scanned" }] });
    expect(await Effect.runPromise(Effect.flip(verdictSvc(test.http, tenantId, otherRepoId, COMMIT, NOW)))).toMatchObject({ _tag: "NotFound" });
    expect(await Effect.runPromise(Effect.flip(verdictSvc(test.http, otherTenantId, repoId, COMMIT, NOW)))).toMatchObject({ _tag: "NotFound" });
  });

  it("counts only succeeded lite scans of this commit, and a scan of a ref counts", async () => {
    await test.raw.insert(scans).values([
      scan("good-1", 1),
      scan("on-branch", 2, { ref: "feature/x" }),
      scan("failed", 3, { status: "failed" }),
      scan("full", 4, { skill: "full" }),
      scan("other-commit", 5, { commitSha: ELSEWHERE }),
    ]);
    await test.raw.insert(scanFindings).values([found("other-commit", "z", "critical"), found("failed", "y", "critical")]);

    expect(await run()).toMatchObject({ verdict: "pass", scans: { counted: 2, ids: ["on-branch", "good-1"] }, open: [] });
  });

  it("merges the findings of every scan and reads the decisions of people", async () => {
    await test.raw.insert(scanFindings).values([found("good-1", "a", "high"), found("on-branch", "b", "medium"), found("on-branch", "c", "high")]);
    await test.raw.insert(scanFindingTriage).values([
      { tenantId, repoId, fingerprint: fp("c"), status: "false_positive", note: "test fixture" },
      { tenantId, repoId, fingerprint: fp("a"), status: "accepted_risk", note: "behind the VPN", acceptedUntil: new Date("2026-12-01T00:00:00Z") },
    ]);

    const verdict = await run();

    expect(verdict.verdict).toBe("pass");
    expect(verdict.open.map((item) => item.title)).toEqual(["problem b"]);
    expect(verdict.accepted.map((item) => item.note)).toEqual(["behind the VPN"]);
    expect(verdict.dismissed.map((item) => item.title)).toEqual(["problem c"]);
  });

  it("never reads another account's scans, findings or decisions", async () => {
    await test.raw.insert(scans).values([
      scanValues(otherTenantId, otherRepoId, "theirs-1", "2026-11-01T00:00:00Z", { commitSha: COMMIT }),
      scanValues(otherTenantId, otherRepoId, "theirs-2", "2026-11-02T00:00:00Z", { commitSha: COMMIT }),
    ]);
    await test.raw.insert(scanFindings).values(found("theirs-1", "q", "critical", otherTenantId));

    expect((await run()).open.map((item) => item.title)).toEqual(["problem b"]);
    expect((await run(COMMIT, otherRepoId, otherTenantId)).verdict).toBe("fail");
  });

  it("reads the decisions now, so an accepted risk that ran out blocks again", async () => {
    const later = await Effect.runPromise(verdictSvc(test.http, tenantId, repoId, COMMIT, new Date("2026-12-02T00:00:00Z")));

    expect(later.verdict).toBe("fail");
    expect(later.open.find((item) => item.title === "problem a")?.acceptanceExpiredAt).toBe("2026-12-01T00:00:00.000Z");
  });
});
