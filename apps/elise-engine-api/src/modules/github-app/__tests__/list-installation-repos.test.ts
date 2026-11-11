import { describe, expect, it } from "vitest";
import { listInstallationRepos } from "#/modules/github-app";

const repoPage = (from: number, count: number) =>
  Response.json({ repositories: Array.from({ length: count }, (_, index) => ({ full_name: `octo/r${from + index}`, html_url: `https://github.com/octo/r${from + index}`, private: false })) });

const fakeGithub = (pageSizes: number[]) => {
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    urls.push(String(input));
    const page = urls.length;
    const before = pageSizes.slice(0, page - 1).reduce((total, size) => total + size, 0);
    return repoPage(before, pageSizes[page - 1] ?? 0);
  };
  return { urls, fetchImpl };
};

describe("listInstallationRepos", () => {
  it("asks once when the first page is short", async () => {
    const github = fakeGithub([40]);

    const repos = await listInstallationRepos("ghs_FAKE", github.fetchImpl);

    expect(github.urls).toEqual(["https://api.github.com/installation/repositories?per_page=100&page=1"]);
    expect(repos).toHaveLength(40);
  });

  it("reads page after page until a short one, and keeps every repo in order", async () => {
    const github = fakeGithub([100, 100, 50]);

    const repos = await listInstallationRepos("ghs_FAKE", github.fetchImpl);

    expect(github.urls).toHaveLength(3);
    expect(repos).toHaveLength(250);
    expect(repos[0]?.fullName).toBe("octo/r0");
    expect(repos[249]?.fullName).toBe("octo/r249");
  });

  it("stops at 10 pages, so one request cannot turn into an endless run of GitHub calls", async () => {
    const github = fakeGithub(Array.from({ length: 20 }, () => 100));

    const repos = await listInstallationRepos("ghs_FAKE", github.fetchImpl);

    expect(github.urls).toHaveLength(10);
    expect(repos).toHaveLength(1000);
  });

  it("fails when GitHub refuses a later page, rather than returning a short list", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => (++calls === 1 ? repoPage(0, 100) : Response.json({ message: "no" }, { status: 403 }));

    await expect(listInstallationRepos("ghs_FAKE", fetchImpl)).rejects.toThrow("403");
  });
});
