import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { tenantGithubInstallations } from "@repo/db-elise/schema";
import { makeRsaKey } from "#/__tests__/rsa-key";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { githubAccessFor, neonInstallationRepo, type GithubAccessEnv } from "#/modules/github-installs";

let test: TestDb;
let acme: string;
let other: string;
let acmeRow: string;
let acmeParty: string;
let env: GithubAccessEnv;

const connect = async (tenant: { tenantId: string; partyId: string }, installationId: number, status = "active") => {
  const [row] = await test.raw
    .insert(tenantGithubInstallations)
    .values({
      tenantId: tenant.tenantId,
      installationId,
      accountLogin: "octo",
      repositorySelection: "selected",
      status,
      connectedBy: tenant.partyId,
      noticeAcceptedAt: new Date(),
    })
    .returning();
  return row.id;
};

beforeAll(async () => {
  test = await openTestDb();
  const first = await seedTenant(test, "acme");
  const second = await seedTenant(test, "other");
  acme = first.tenantId;
  other = second.tenantId;
  acmeParty = first.partyId;
  acmeRow = await connect(first, 42);
  await connect(second, 99);
  env = { GITHUB_APP_ID: "12345", GITHUB_APP_PRIVATE_KEY: (await makeRsaKey()).pem };
});

afterAll(async () => {
  await test.close();
});

type GithubAnswers = { covering?: Response; token?: Response; repo?: Response };

const fakeGithub = (answers: GithubAnswers) => {
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    if (url.endsWith("/installation")) return answers.covering ?? Response.json({ id: 42 });
    if (url.endsWith("/access_tokens")) return answers.token ?? Response.json({ token: "ghs_FAKE" }, { status: 201 });
    return answers.repo ?? Response.json({ id: 7, private: true });
  };
  return { urls, fetchImpl };
};

const forRepo = (accountId: string, answers: GithubAnswers, appEnv: GithubAccessEnv = env, url = "https://github.com/Octo/Hello.git") => {
  const github = fakeGithub(answers);
  const access = githubAccessFor(appEnv, neonInstallationRepo(test.http), accountId, github.fetchImpl);
  return { github, result: Effect.runPromise(access.forRepo(url)) };
};

describe("githubAccessFor", () => {
  it("signs for a repo an install of the Account covers, and names it as a Scan's repo is named", async () => {
    const { result, github } = forRepo(acme, {});

    await expect(result).resolves.toEqual({ installationRowId: acmeRow, installationId: 42, repoId: 7, repo: "octo/hello", isPrivate: true });
    expect(github.urls[0]).toBe("https://api.github.com/repos/octo/hello/installation");
  });

  it("passes a public repo's answer through", async () => {
    const { result } = forRepo(acme, { repo: Response.json({ id: 8, private: false }) });

    await expect(result).resolves.toMatchObject({ repoId: 8, isPrivate: false });
  });

  it("does not sign with an install that belongs to another Account, and never asks GitHub for a token", async () => {
    const { result, github } = forRepo(acme, { covering: Response.json({ id: 99 }) });

    await expect(result).resolves.toBeNull();
    expect(github.urls.some((url) => url.endsWith("/access_tokens"))).toBe(false);
  });

  it("does not sign for another Account's install the other way round either", async () => {
    const { result } = forRepo(other, { covering: Response.json({ id: 42 }) });

    await expect(result).resolves.toBeNull();
  });

  it.each(["suspended", "removed"])("does not sign with an install that is %s", async (status) => {
    const installationId = status === "removed" ? 501 : 502;
    await connect({ tenantId: acme, partyId: acmeParty }, installationId, status);
    const { result } = forRepo(acme, { covering: Response.json({ id: installationId }) });

    await expect(result).resolves.toBeNull();
  });

  it("clones anonymously when the App is not on the repo", async () => {
    const { result } = forRepo(acme, { covering: Response.json({ message: "Not Found" }, { status: 404 }) });

    await expect(result).resolves.toBeNull();
  });

  it("clones anonymously when the App is not set up, without calling GitHub", async () => {
    const { result, github } = forRepo(acme, {}, {});

    await expect(result).resolves.toBeNull();
    expect(github.urls).toEqual([]);
  });

  it("does not hold a public scan back when GitHub cannot say which install covers the repo", async () => {
    const { result } = forRepo(acme, { covering: new Response("down", { status: 500 }) });

    await expect(result).resolves.toBeNull();
  });

  it("fails with ExternalError when the install covers the repo but GitHub will not let it be read", async () => {
    const github = fakeGithub({ repo: new Response("down", { status: 500 }) });
    const access = githubAccessFor(env, neonInstallationRepo(test.http), acme, github.fetchImpl);

    const error = await Effect.runPromise(Effect.flip(access.forRepo("https://github.com/octo/hello")));

    expect(error._tag).toBe("ExternalError");
  });
});
