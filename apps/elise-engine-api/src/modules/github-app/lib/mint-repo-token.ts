import { z } from "zod";
import { GITHUB_API_URL, GITHUB_API_VERSION } from "#/modules/github-app/constants";
import type { GithubAppConfig, GithubFetch } from "#/modules/github-app/types";
import { createAppJwt } from "#/modules/github-app/utils";
import { GithubHttpError } from "./github-http-error";

const TokenSchema = z.looseObject({ token: z.string() });

export const githubHeaders = (jwtOrToken: string) => ({
  authorization: `Bearer ${jwtOrToken}`,
  accept: "application/vnd.github+json",
  "x-github-api-version": GITHUB_API_VERSION,
  "user-agent": "elise-engine",
});

type TokenScope = { repository_ids: number[] } | { repositories: string[] };

// -----
// A read-only token of one install, good for an hour, limited to
// the repo in scope. The message names the status and never the
// token or the key, so a log line is safe to keep.
// -----
const requestToken = async (config: GithubAppConfig, installationId: number, scope: TokenScope | null, fetchImpl: GithubFetch): Promise<string> => {
  const response = await fetchImpl(`${GITHUB_API_URL}/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: { ...githubHeaders(await createAppJwt(config)), "content-type": "application/json" },
    body: JSON.stringify({ ...scope, permissions: { contents: "read" } }),
  });
  if (response.status !== 201) throw new GithubHttpError(`GitHub refused an installation token: ${response.status}`, response.status);
  const body = TokenSchema.safeParse(await response.json());
  if (!body.success) throw new Error("GitHub sent no installation token");
  return body.data.token;
};

export const mintRepoToken = (config: GithubAppConfig, installationId: number, repoId: number, fetchImpl: GithubFetch = fetch): Promise<string> =>
  requestToken(config, installationId, { repository_ids: [repoId] }, fetchImpl);

// -----
// For the one moment the repo's ID is not known yet: the repo is
// named instead. The token is used for one read and then dropped.
// -----
// -----
// For a read of the whole install (which repos it can see). It never
// leaves the Worker and is dropped after the read.
// -----
export const mintInstallationToken = (config: GithubAppConfig, installationId: number, fetchImpl: GithubFetch = fetch): Promise<string> =>
  requestToken(config, installationId, null, fetchImpl);

export const mintRepoTokenByName =(config: GithubAppConfig, installationId: number, name: string, fetchImpl: GithubFetch = fetch): Promise<string> =>
  requestToken(config, installationId, { repositories: [name] }, fetchImpl);
