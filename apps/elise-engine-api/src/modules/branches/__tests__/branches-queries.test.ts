import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { REPO_BRANCH_LIMIT, REPO_LIMIT_PER_TENANT } from "@repo/contracts/elise";
import { scanRepoBranches, scanRepos } from "@repo/db-elise/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { addBranchesEffect, findBranchEffect, normalizeBranchName, resolveScanBranchEffect } from "#/modules/branches";
import { addRepoEffect } from "#/modules/repos/queries";

let test: TestDb;
let tenantId: string;
let otherTenantId: string;

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const fail = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect));

let counter = 0;
const newRepo = async (tenant = tenantId, defaultBranch: string | null = null) => {
  counter += 1;
  const [repo] = await test.raw
    .insert(scanRepos)
    .values({ tenantId: tenant, canonical: `octo/repo-${counter}`, url: `https://github.com/octo/repo-${counter}`, defaultBranch })
    .returning();
  return repo.id;
};

const namesOf = async (repoId: string) =>
  (await test.raw.select({ name: scanRepoBranches.name }).from(scanRepoBranches).where(eq(scanRepoBranches.repoId, repoId))).map((row) => row.name).toSorted();

const pointerOf = async (repoId: string) => (await test.raw.select({ pointer: scanRepos.defaultBranch }).from(scanRepos).where(eq(scanRepos.id, repoId)))[0].pointer;

const resolveOutcome = (repoId: string, name: string | null, ref: string | null, tenant = tenantId) =>
  run(resolveScanBranchEffect(test.http, tenant, repoId, { name, ref }));
const resolve = async (repoId: string, name: string | null, ref: string | null, tenant = tenantId) => (await resolveOutcome(repoId, name, ref, tenant)).id;
const filler = (count: number) => Array.from({ length: count }, (_, k) => `b${k}`);

beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
  otherTenantId = (await seedTenant(test, "other")).tenantId;
});

afterAll(async () => {
  await test.close();
});

describe("normalizeBranchName", () => {
  it("gives one spelling to one branch and keeps the case", () => {
    expect(normalizeBranchName("main")).toBe("main");
    expect(normalizeBranchName("  refs/heads/main ")).toBe("main");
    expect(normalizeBranchName("release/1.2")).toBe("release/1.2");
    expect(normalizeBranchName("Main")).toBe("Main");
  });

  it("gives HEAD and an empty name no branch", () => {
    expect(normalizeBranchName("HEAD")).toBeNull();
    expect(normalizeBranchName("  ")).toBeNull();
    expect(normalizeBranchName("refs/heads/")).toBeNull();
  });
});

describe("resolveScanBranchEffect", () => {
  it("says why a scan that read no branch has no History", async () => {
    const repoId = await newRepo();

    expect(await resolveOutcome(repoId, null, null)).toEqual({ id: null, reason: "the clone was not on a branch, so this scan has no History" });
    expect(await resolveOutcome(repoId, null, "v1.0.0")).toEqual({ id: null, reason: '"v1.0.0" is a tag or a commit, not a branch, so this scan has no History' });
    expect(await namesOf(repoId)).toEqual([]);
  });

  it("makes the default branch tracked at its first scan, and points the repo at it", async () => {
    const repoId = await newRepo();

    const first = await resolve(repoId, "main", null);
    const second = await resolve(repoId, "main", null);

    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(await namesOf(repoId)).toEqual(["main"]);
    expect(await pointerOf(repoId)).toBe("main");
  });

  it("treats a typed main as the discovered main: one branch, one history", async () => {
    const repoId = await newRepo();
    const discovered = await resolve(repoId, "main", null);

    const typed = await resolve(repoId, "main", "main");

    expect(typed).toBe(discovered);
    expect(await namesOf(repoId)).toEqual(["main"]);
  });

  it("tracks any real branch at its first successful scan, and moves no pointer", async () => {
    const repoId = await newRepo(tenantId, "main");

    const outcome = await resolveOutcome(repoId, "feature/x", "feature/x");
    const again = await resolve(repoId, "feature/x", "feature/x");

    expect(outcome).toEqual({ id: expect.any(String), reason: null });
    expect(again).toBe(outcome.id);
    expect(await namesOf(repoId)).toEqual(["feature/x"]);
    expect(await pointerOf(repoId)).toBe("main");
  });

  it("knows Main and main as two branches, because git does", async () => {
    const repoId = await newRepo();
    const lower = await resolve(repoId, "main", "main");

    const upper = await resolve(repoId, "Main", "Main");

    expect(upper).not.toBe(lower);
    expect(await namesOf(repoId)).toEqual(["Main", "main"]);
  });

  it("finds a branch that was added by name", async () => {
    const repoId = await newRepo(tenantId, "main");
    const [added] = await run(addBranchesEffect(test.pool, tenantId, repoId, ["release"]));

    expect(await resolve(repoId, "release", "release")).toBe(added.id);
  });

  it("moves the default pointer when the default changes, and starts a new branch for it", async () => {
    const repoId = await newRepo();
    const main = await resolve(repoId, "main", null);

    const develop = await resolve(repoId, "develop", null);

    expect(develop).not.toBe(main);
    expect(await pointerOf(repoId)).toBe("develop");
    expect(await namesOf(repoId)).toEqual(["develop", "main"]);
  });

  it("gives a new branch no History when the repo has no free slot, says why, and still points at a new default", async () => {
    const repoId = await newRepo();
    await run(addBranchesEffect(test.pool, tenantId, repoId, filler(REPO_BRANCH_LIMIT)));

    expect(await resolveOutcome(repoId, "develop", null)).toEqual({ id: null, reason: `the repo already tracks ${REPO_BRANCH_LIMIT} branches, so this scan has no History` });
    expect(await resolve(repoId, "feature/y", "feature/y")).toBeNull();
    expect(await pointerOf(repoId)).toBe("develop");
    expect(await namesOf(repoId)).toEqual(filler(REPO_BRANCH_LIMIT).toSorted());
  });

  it("does not see a repo of another account", async () => {
    const repoId = await newRepo();

    expect(await resolveOutcome(repoId, "main", null, otherTenantId)).toEqual({ id: null, reason: null });
    expect(await namesOf(repoId)).toEqual([]);
  });
});

describe("addBranchesEffect", () => {
  it("adds branches, once each, and answers every branch of the repo", async () => {
    const repoId = await newRepo();

    const first = await run(addBranchesEffect(test.pool, tenantId, repoId, ["main", "release", "main"]));
    const again = await run(addBranchesEffect(test.pool, tenantId, repoId, ["release"]));

    expect(first.map((branch) => branch.name).toSorted()).toEqual(["main", "release"]);
    expect(again).toHaveLength(2);
  });

  it(`refuses a repo's ${REPO_BRANCH_LIMIT + 1}th branch, names the tracked ones, and adds none of the request`, async () => {
    const repoId = await newRepo();
    await run(addBranchesEffect(test.pool, tenantId, repoId, filler(REPO_BRANCH_LIMIT - 1)));

    const error = await fail(addBranchesEffect(test.pool, tenantId, repoId, ["x", "y"]));

    expect(error).toMatchObject({ _tag: "Conflict", message: `A repo can track at most ${REPO_BRANCH_LIMIT} branches; it tracks ${filler(REPO_BRANCH_LIMIT - 1).toSorted().join(", ")}` });
    expect(await namesOf(repoId)).toEqual(filler(REPO_BRANCH_LIMIT - 1).toSorted());
  });

  it("is NotFound for a repo of another account", async () => {
    const repoId = await newRepo();

    expect(await fail(addBranchesEffect(test.pool, otherTenantId, repoId, ["main"]))).toMatchObject({ _tag: "NotFound" });
  });

  it("is found by exact name", async () => {
    const repoId = await newRepo();
    await run(addBranchesEffect(test.pool, tenantId, repoId, ["release"]));

    expect(await run(findBranchEffect(test.http, tenantId, repoId, "release"))).toMatchObject({ name: "release" });
    expect(await run(findBranchEffect(test.http, tenantId, repoId, "Release"))).toBeNull();
  });
});

describe("addRepoEffect", () => {
  const URL = "https://github.com/octocat/Hello-World";

  it("adds a repo with its branches, and the same repo in another spelling is the repo already there", async () => {
    const id = await run(addRepoEffect(test.pool, tenantId, URL, ["main", "release"]));
    const again = await run(addRepoEffect(test.pool, tenantId, "https://github.com/OCTOCAT/hello-world.git/", ["develop"]));

    expect(again).toBe(id);
    expect(await namesOf(id)).toEqual(["develop", "main", "release"]);
  });

  it("adds a repo with no branches", async () => {
    const id = await run(addRepoEffect(test.pool, tenantId, "https://github.com/octocat/Spoon-Knife", []));

    expect(await namesOf(id)).toEqual([]);
    expect((await test.raw.select().from(scanRepos).where(eq(scanRepos.id, id)))[0].defaultBranch).toBeNull();
  });

  it("leaves no repo behind when its branches are refused", async () => {
    const before = (await test.raw.select().from(scanRepos).where(eq(scanRepos.tenantId, tenantId))).length;

    const error = await fail(addRepoEffect(test.pool, tenantId, "https://github.com/octocat/refused", filler(REPO_BRANCH_LIMIT + 1)));

    expect(error).toMatchObject({ _tag: "Conflict" });
    expect((await test.raw.select().from(scanRepos).where(eq(scanRepos.tenantId, tenantId))).length).toBe(before);
  });

  it(`refuses a repo past ${REPO_LIMIT_PER_TENANT} for the account, but still answers one it has`, async () => {
    const full = (await seedTenant(test, "full")).tenantId;
    await test.raw
      .insert(scanRepos)
      .values(Array.from({ length: REPO_LIMIT_PER_TENANT }, (_, k) => ({ tenantId: full, canonical: `octo/full-${k}`, url: `https://github.com/octo/full-${k}` })));

    const refused = await fail(addRepoEffect(test.pool, full, "https://github.com/octo/one-too-many", []));
    const existing = await run(addRepoEffect(test.pool, full, "https://github.com/octo/full-0", ["main"]));

    expect(refused).toMatchObject({ _tag: "Conflict" });
    expect(await namesOf(existing)).toEqual(["main"]);
  });
});
