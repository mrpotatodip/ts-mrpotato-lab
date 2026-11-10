import { z } from "zod";
import { GITHUB_API_URL, GITHUB_INSTALLATION_REPOS_MAX_PAGES, GITHUB_REPOS_PER_PAGE } from "#/modules/github-app/constants";
import type { GithubFetch, GithubListedRepo } from "#/modules/github-app/types";
import { githubHeaders } from "./mint-repo-token";

const ReposSchema = z.looseObject({
  repositories: z.array(z.looseObject({ full_name: z.string(), html_url: z.string(), private: z.boolean() })),
});

// -----
// The repos an install can see, a page of 100 at a time. A short page is
// the last one. The ceiling (1000 repos) keeps one request to our API from
// turning into an unbounded run of GitHub calls: an install bigger than
// that shows its first 1000.
// -----
export const listInstallationRepos = async (installationToken: string, fetchImpl: GithubFetch = fetch): Promise<GithubListedRepo[]> => {
  const repos: GithubListedRepo[] = [];
  for (let page = 1; page <= GITHUB_INSTALLATION_REPOS_MAX_PAGES; page++) {
    const response = await fetchImpl(`${GITHUB_API_URL}/installation/repositories?per_page=${GITHUB_REPOS_PER_PAGE}&page=${page}`, { headers: githubHeaders(installationToken) });
    if (response.status !== 200) throw new Error(`GitHub could not list the install's repos: ${response.status}`);
    const body = ReposSchema.safeParse(await response.json());
    if (!body.success) throw new Error("GitHub sent no repo list");
    repos.push(...body.data.repositories.map((repo) => ({ fullName: repo.full_name, url: repo.html_url, isPrivate: repo.private })));
    if (body.data.repositories.length < GITHUB_REPOS_PER_PAGE) break;
  }
  return repos;
};
