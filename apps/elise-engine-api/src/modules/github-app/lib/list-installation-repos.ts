import { z } from "zod";
import { GITHUB_API_URL } from "#/modules/github-app/constants";
import type { GithubFetch, GithubListedRepo } from "#/modules/github-app/types";
import { githubHeaders } from "./mint-repo-token";

const ReposSchema = z.looseObject({
  repositories: z.array(z.looseObject({ full_name: z.string(), html_url: z.string(), private: z.boolean() })),
});

// -----
// The first 100 repos an install can see. The picker shows them; a
// longer list is a later problem.
// -----
export const listInstallationRepos = async (installationToken: string, fetchImpl: GithubFetch = fetch): Promise<GithubListedRepo[]> => {
  const response = await fetchImpl(`${GITHUB_API_URL}/installation/repositories?per_page=100`, { headers: githubHeaders(installationToken) });
  if (response.status !== 200) throw new Error(`GitHub could not list the install's repos: ${response.status}`);
  const body = ReposSchema.safeParse(await response.json());
  if (!body.success) throw new Error("GitHub sent no repo list");
  return body.data.repositories.map((repo) => ({ fullName: repo.full_name, url: repo.html_url, isPrivate: repo.private }));
};
