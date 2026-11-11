import {
  exchangeOAuthCode,
  getAppSlug,
  getInstallation,
  getRepoBranches,
  listInstallationRepos,
  mintInstallationToken,
  userInstallationIds,
  type GithubFetch,
} from "#/modules/github-app";
import type { GithubConnectEnv, GithubPort } from "#/modules/github-installs/types";

// -----
// The real questions to GitHub. Null while any of the four values is
// missing or blank, so a server without the App set up connects nobody.
// -----
export const githubPortFor = (env: GithubConnectEnv, fetchImpl?: GithubFetch): GithubPort | null => {
  const { GITHUB_APP_ID: appId, GITHUB_APP_PRIVATE_KEY: privateKey, GITHUB_APP_CLIENT_ID: clientId, GITHUB_APP_CLIENT_SECRET: clientSecret } = env;
  if (!appId || !privateKey || !clientId || !clientSecret) return null;
  const app = { appId, privateKey };
  return {
    appSlug: () => getAppSlug(app, fetchImpl),
    exchangeCode: (code) => exchangeOAuthCode({ clientId, clientSecret }, code, fetchImpl),
    userInstallationIds: (userToken) => userInstallationIds(userToken, fetchImpl),
    installation: (installationId) => getInstallation(app, installationId, fetchImpl),
    repoBranches: (installationId, owner, name) => getRepoBranches(app, installationId, owner, name, fetchImpl),
    installationRepos: async (installationId) => listInstallationRepos(await mintInstallationToken(app, installationId, fetchImpl), fetchImpl),
  };
};
