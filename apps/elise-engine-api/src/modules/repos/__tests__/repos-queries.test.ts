import { Effect } from "effect";
import { scanFindings, scanFindingTriage, scanRepoBranches, scanRepoFindings, scanRepos, scans } from "@repo/db-elise/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { branchIdOf, openTestDb, scanValues, seedRepo, seedTenant, type TestDb } from "#/__tests__/test-db";
import { getRepoEffect, listRepoBranchesEffect, listReposEffect, scanDiffEffect } from "#/modules/repos/queries";
import { addBranchSvc, listRepoFindingsSvc } from "#/modules/repos/handlers";

let test: TestDb;
let tenantId: string;
let repoId: string;
let branchId: string;

const fp = (letter: string) => letter.repeat(64);
const titles = (entries: { title: string }[]) => entries.map((entry) => entry.title);
const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const fail = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect));

const scan = (id: string, createdAt: string, extra: Partial<typeof scans.$inferInsert> = {}) =>
  scanValues(tenantId, repoId, id, createdAt, { branch: "main", branchId, commitSha: `${id}-sha`, ...extra });

const found = (scanId: string, letter: string, severity: "critical" | "high" | "medium" | "low", origin: "new" | "carried" = "new") => ({
  tenantId,
  scanId,
  findingId: `${scanId}-${letter}`,
  fingerprint: fp(letter),
  status: "confirmed" as const,
  severity,
  title: `problem ${letter}`,
  class: "authz",
  file: `src/${letter}.ts`,
  origin,
});

const history = (letter: string, extra: Partial<typeof scanRepoFindings.$inferInsert>) => ({
  repoId,
  branchId,
  tenantId,
  fingerprint: fp(letter),
  state: "open" as const,
  firstSeenScanId: "s1",
  lastSeenScanId: "s2",
  ...extra,
});

// -----
// s0: e. s1: a, b, d (e gone). s2: a re-checked, c new, e back.
// b was checked and gone in s2; d simply vanished from the list.
// -----
beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
  repoId = await seedRepo(test, tenantId);
  branchId = await branchIdOf(test, repoId);
  await test.raw.insert(scans).values([scan("s0", "2026-10-31T00:00:00Z"), scan("s1", "2026-11-01T00:00:00Z"), scan("s2", "2026-11-02T00:00:00Z"), scan("full", "2026-11-03T00:00:00Z", { skill: "full" })]);
  await test.raw.insert(scanFindings).values([
    found("s0", "e", "low"),
    found("s1", "a", "high"),
    found("s1", "b", "medium"),
    found("s1", "d", "low"),
    found("s2", "a", "high", "carried"),
    found("s2", "c", "critical"),
    found("s2", "e", "low"),
  ]);
  await test.raw.insert(scanRepoFindings).values([
    history("a", {}),
    history("b", { state: "fixed_by_code", lastSeenScanId: "s1", fixedInScanId: "s2" }),
    history("c", { firstSeenScanId: "s2" }),
    history("d", { lastSeenScanId: "s1", unchecked: true }),
    history("e", { state: "regressed", firstSeenScanId: "s0", fixedInScanId: "s1" }),
  ]);
  await test.raw.insert(scanFindingTriage).values({ tenantId, repoId, fingerprint: fp("c"), status: "false_positive" });
});

afterAll(async () => {
  await test.close();
});

describe("listReposEffect", () => {
  it("counts the scans, names the latest and counts only what is still open", async () => {
    const [repo] = await run(listReposEffect(test.http, tenantId));

    expect(repo).toMatchObject({ id: repoId, canonical: "octocat/hello-world", branchNames: ["main"], scans: 4, lastScanId: "full", lastScanStatus: "succeeded" });
    expect(repo.open).toEqual({
      total: 3,
      severity: { critical: 0, high: 1, medium: 0, low: 2, informational: 0 },
      needsValidation: 0,
      regressed: 1,
      unchecked: 1,
    });
  });

  it("shows a repo added with no branches and no scans, with an empty list of branch names", async () => {
    const fresh = (await seedTenant(test, "fresh")).tenantId;
    await test.raw.insert(scanRepos).values({ tenantId: fresh, canonical: "octo/new", url: "https://github.com/octo/new" });

    const [repo] = await run(listReposEffect(test.http, fresh));

    expect(repo).toMatchObject({ canonical: "octo/new", defaultBranch: null, branchNames: [], scans: 0, lastScanId: null });
    expect(repo.open.total).toBe(0);
  });

  it("shows nothing of another account", async () => {
    const other = (await seedTenant(test, "other")).tenantId;

    expect(await run(listReposEffect(test.http, other))).toEqual([]);
    expect(await fail(getRepoEffect(test.http, other, repoId))).toMatchObject({ _tag: "NotFound" });
  });
});

describe("listRepoFindingsSvc", () => {
  it("returns every problem, worst first, with its state and who decided what", async () => {
    const page = await run(listRepoFindingsSvc(test.http, tenantId, repoId, { limit: 50 }));

    expect(page.findings.map((finding) => [finding.title, finding.state])).toEqual([
      ["problem c", "open"],
      ["problem a", "open"],
      ["problem b", "fixed_by_code"],
      ["problem e", "regressed"],
      ["problem d", "open"],
    ]);
    expect(page.findings[0].triage).toMatchObject({ status: "false_positive" });
    expect(page.findings.find((finding) => finding.title === "problem d")).toMatchObject({ unchecked: true, scanId: "s1" });
  });

  it("filters by state and pages with a cursor", async () => {
    const regressed = await run(listRepoFindingsSvc(test.http, tenantId, repoId, { limit: 50, state: "regressed" }));
    const first = await run(listRepoFindingsSvc(test.http, tenantId, repoId, { limit: 2 }));
    const second = await run(listRepoFindingsSvc(test.http, tenantId, repoId, { limit: 2, cursor: first.nextCursor ?? undefined }));

    expect(regressed.findings.map((finding) => finding.title)).toEqual(["problem e"]);
    expect(first.findings).toHaveLength(2);
    expect(second.findings).toHaveLength(2);
    expect(second.nextCursor).toBe("4");
  });

  it("is NotFound for a repo of another account", async () => {
    const other = (await seedTenant(test, "third")).tenantId;

    expect(await fail(listRepoFindingsSvc(test.http, other, repoId, { limit: 50 }))).toMatchObject({ _tag: "NotFound" });
  });
});

describe("scans with no tracked branch", () => {
  it("cannot be compared, and are not the previous scan of a later one", async () => {
    await test.raw.insert(scans).values([scan("branch", "2026-11-02T12:00:00Z", { ref: "feature/x", branch: null, branchId: null }), scan("s3", "2026-11-04T00:00:00Z")]);
    await test.raw.insert(scanFindings).values([found("branch", "a", "high"), found("s3", "a", "high")]);

    expect(await fail(scanDiffEffect(test.http, tenantId, "branch"))).toMatchObject({ _tag: "Invalid" });
    expect((await run(scanDiffEffect(test.http, tenantId, "s3"))).previousScanId).toBe("s2");
  });
});

describe("scanDiffEffect", () => {
  it("sorts a scan against the previous one", async () => {
    const diff = await run(scanDiffEffect(test.http, tenantId, "s2"));

    expect(diff.previousScanId).toBe("s1");
    expect(titles(diff.stillOpen)).toEqual(["problem a"]);
    expect(titles(diff.new)).toEqual(["problem c"]);
    expect(titles(diff.regressed)).toEqual(["problem e"]);
    expect(titles(diff.fixed)).toEqual(["problem b"]);
    expect(titles(diff.notRechecked)).toEqual(["problem d"]);
  });

  it("calls everything new in the first scan", async () => {
    const diff = await run(scanDiffEffect(test.http, tenantId, "s0"));

    expect(diff.previousScanId).toBeNull();
    expect(diff.stillOpen).toEqual([]);
    expect(diff.regressed).toEqual([]);
  });

  it("refuses a scan that has no recorded findings, and one that is not there", async () => {
    expect(await fail(scanDiffEffect(test.http, tenantId, "full"))).toMatchObject({ _tag: "Invalid" });
    expect(await fail(scanDiffEffect(test.http, tenantId, "nope"))).toMatchObject({ _tag: "NotFound" });
  });
});

describe("a second branch", () => {
  let releaseId: string;

  beforeAll(async () => {
    [{ id: releaseId }] = await test.raw.insert(scanRepoBranches).values({ tenantId, repoId, name: "release" }).returning({ id: scanRepoBranches.id });
    await test.raw.insert(scans).values(scan("r1", "2026-11-05T00:00:00Z", { branch: "release", branchId: releaseId }));
    await test.raw.insert(scanFindings).values(found("r1", "x", "medium"));
    await test.raw.insert(scanRepoFindings).values({ ...history("x", { firstSeenScanId: "r1", lastSeenScanId: "r1" }), branchId: releaseId });
  });

  it("has its own problems, and the default branch's list does not change", async () => {
    const release = await run(listRepoFindingsSvc(test.http, tenantId, repoId, { limit: 50, branch: "release" }));
    const main = await run(listRepoFindingsSvc(test.http, tenantId, repoId, { limit: 50 }));

    expect(release.findings.map((finding) => finding.title)).toEqual(["problem x"]);
    expect(main.findings.map((finding) => finding.title)).not.toContain("problem x");
  });

  it("does not change the repo's open counts, which are the default branch's", async () => {
    const [repo] = await run(listReposEffect(test.http, tenantId));

    expect(repo.open.severity.medium).toBe(0);
    expect(repo.defaultBranch).toBe("main");
    expect(repo.branchNames).toEqual(["main", "release"]);
  });

  it("is listed with its own counts and the commit of its newest succeeded scan", async () => {
    const branches = await run(listRepoBranchesEffect(test.http, tenantId, repoId));

    expect(branches.map((branch) => [branch.name, branch.isDefault])).toEqual([["main", true], ["release", false]]);
    expect(branches[1]).toMatchObject({ latestScanId: "r1", latestCommit: "r1-sha", open: { total: 1, severity: { medium: 1 } } });
    expect(branches[0].latestScanId).toBe("s3");
  });

  it("compares a scan only with the previous scan of its own branch", async () => {
    const diff = await run(scanDiffEffect(test.http, tenantId, "r1"));

    expect(diff.previousScanId).toBeNull();
    expect(titles(diff.new)).toEqual(["problem x"]);
  });

  it("is NotFound for a branch the repo does not track", async () => {
    expect(await fail(listRepoFindingsSvc(test.http, tenantId, repoId, { limit: 50, branch: "nope" }))).toMatchObject({ _tag: "NotFound" });
  });
});

describe("addBranchSvc", () => {
  it("refuses a commit id and HEAD, which are not branches, and tracks nothing", async () => {
    const commit = await fail(addBranchSvc(test.http, test.pool, tenantId, repoId, { name: "7495881421f63f1e64673e7f32bbb1f40555435d" }));
    const head = await fail(addBranchSvc(test.http, test.pool, tenantId, repoId, { name: "HEAD" }));
    const names = (await run(listRepoBranchesEffect(test.http, tenantId, repoId))).map((branch) => branch.name);

    expect(commit).toMatchObject({ _tag: "Invalid", message: expect.stringContaining("is a commit, not a branch") });
    expect(head).toMatchObject({ _tag: "Invalid" });
    expect(names).not.toContain("7495881421f63f1e64673e7f32bbb1f40555435d");
  });
});
