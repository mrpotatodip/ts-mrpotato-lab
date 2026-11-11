import { describe, expect, it } from "vitest";
import { getRepoBranches } from "#/modules/github-app";
import { makeRsaKey } from "#/__tests__/rsa-key";

type Answers = { token?: Response; repo?: Response; branches?: Response };

const fakeGithub = (answers: Answers) => {
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    if (url.endsWith("/access_tokens")) return answers.token ?? Response.json({ token: "ghs_FAKE" }, { status: 201 });
    if (url.includes("/branches")) return answers.branches ?? Response.json([{ name: "develop" }, { name: "main" }, { name: "zeta" }]);
    return answers.repo ?? Response.json({ default_branch: "main" });
  };
  return { urls, fetchImpl };
};

const run = async (answers: Answers) => {
  const key = await makeRsaKey();
  const github = fakeGithub(answers);
  return { github, result: getRepoBranches({ appId: "12345", privateKey: key.pem }, 42, "octo", "hello", github.fetchImpl) };
};

describe("getRepoBranches", () => {
  it("puts the default branch first and lists each branch once", async () => {
    const { result } = await run({});

    await expect(result).resolves.toEqual({ defaultBranch: "main", branches: ["main", "develop", "zeta"], truncated: false });
  });

  it("asks for a token limited to the one repo, and for 100 branches", async () => {
    const { result, github } = await run({});
    await result;

    expect(github.urls[0]).toBe("https://api.github.com/app/installations/42/access_tokens");
    expect(github.urls).toContain("https://api.github.com/repos/octo/hello/branches?per_page=100");
  });

  it("says when GitHub has another page", async () => {
    const { result } = await run({ branches: Response.json([{ name: "main" }], { headers: { link: '<https://api.github.com/x?page=2>; rel="next"' } }) });

    await expect(result).resolves.toMatchObject({ truncated: true });
  });

  it("keeps the default branch even when it is not on the first page", async () => {
    const { result } = await run({ branches: Response.json([{ name: "a" }, { name: "b" }]) });

    await expect(result).resolves.toMatchObject({ branches: ["main", "a", "b"] });
  });

  it.each([404, 422])("returns null when the install cannot see the repo and GitHub refuses the token with %i", async (status) => {
    const { result } = await run({ token: Response.json({ message: "no" }, { status }) });

    await expect(result).resolves.toBeNull();
  });

  it("returns null when GitHub says the repo is gone", async () => {
    const { result } = await run({ repo: Response.json({ message: "Not Found" }, { status: 404 }) });

    await expect(result).resolves.toBeNull();
  });

  it("fails on a token refusal that is not about visibility, so an outage is not read as 'not found'", async () => {
    const { result } = await run({ token: Response.json({ message: "down" }, { status: 502 }) });

    await expect(result).rejects.toThrow("GitHub refused an installation token: 502");
  });

  it("fails when GitHub cannot list the branches", async () => {
    const { result } = await run({ branches: new Response("down", { status: 500 }) });

    await expect(result).rejects.toThrow("could not list the branches: 500");
  });
});
