import { z } from "zod";
import { GITHUB_API_URL } from "#/modules/github-app/constants";
import type { GithubAppConfig, GithubFetch } from "#/modules/github-app/types";
import { createAppJwt } from "#/modules/github-app/utils";
import { githubHeaders } from "./mint-repo-token";

const InstallationSchema = z.looseObject({ id: z.number() });

// -----
// Which install of the App covers owner/name? GitHub answers the
// App itself, so no install token is needed. Null: the App is
// not installed on that repo (GitHub says 404).
// -----
export const findRepoInstallation = async (config: GithubAppConfig, owner: string, name: string, fetchImpl: GithubFetch = fetch): Promise<number | null> => {
  const response = await fetchImpl(`${GITHUB_API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/installation`, {
    headers: githubHeaders(await createAppJwt(config)),
  });
  if (response.status === 404) return null;
  if (response.status !== 200) throw new Error(`GitHub could not tell which install covers the repo: ${response.status}`);
  const body = InstallationSchema.safeParse(await response.json());
  if (!body.success) throw new Error("GitHub sent no install id");
  return body.data.id;
};
