import { z } from "zod";
import { GITHUB_API_URL } from "#/modules/github-app/constants";
import type { GithubAppConfig, GithubFetch, GithubRepoInfo } from "#/modules/github-app/types";
import { githubHeaders, mintRepoTokenByName } from "./mint-repo-token";

const RepoSchema = z.looseObject({ id: z.number(), private: z.boolean() });

// -----
// What GitHub says about a repo the install covers: its ID, which
// the scan token is limited to, and whether it is private. Null: the
// install cannot see it (GitHub says 404).
// -----
export const getRepoInfo = async (
  config: GithubAppConfig,
  installationId: number,
  owner: string,
  name: string,
  fetchImpl: GithubFetch = fetch,
): Promise<GithubRepoInfo | null> => {
  const token = await mintRepoTokenByName(config, installationId, name, fetchImpl);
  const response = await fetchImpl(`${GITHUB_API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, { headers: githubHeaders(token) });
  if (response.status === 404) return null;
  if (response.status !== 200) throw new Error(`GitHub could not read the repo: ${response.status}`);
  const body = RepoSchema.safeParse(await response.json());
  if (!body.success) throw new Error("GitHub sent no repo id");
  return { repoId: body.data.id, isPrivate: body.data.private };
};
