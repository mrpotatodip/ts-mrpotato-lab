import { z } from "zod";
import { GITHUB_API_URL } from "#/modules/github-app/constants";
import type { GithubAppConfig, GithubFetch, GithubInstallationInfo } from "#/modules/github-app/types";
import { createAppJwt } from "#/modules/github-app/utils";
import { githubHeaders } from "./mint-repo-token";

const InstallationSchema = z.looseObject({
  account: z.looseObject({ login: z.string() }).nullable(),
  repository_selection: z.enum(["all", "selected"]),
  html_url: z.string(),
  suspended_at: z.string().nullable(),
});

// -----
// What GitHub says about one install of the App. Null: no such
// install (GitHub says 404).
// -----
export const getInstallation = async (config: GithubAppConfig, installationId: number, fetchImpl: GithubFetch = fetch): Promise<GithubInstallationInfo | null> => {
  const response = await fetchImpl(`${GITHUB_API_URL}/app/installations/${installationId}`, { headers: githubHeaders(await createAppJwt(config)) });
  if (response.status === 404) return null;
  if (response.status !== 200) throw new Error(`GitHub could not read the install: ${response.status}`);
  const body = InstallationSchema.safeParse(await response.json());
  if (!body.success || body.data.account === null) throw new Error("GitHub sent an install with no account");
  return { accountLogin: body.data.account.login, repositorySelection: body.data.repository_selection, htmlUrl: body.data.html_url, suspended: body.data.suspended_at !== null };
};
