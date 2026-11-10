import { z } from "zod";
import { GITHUB_API_URL, GITHUB_OAUTH_TOKEN_URL, GITHUB_USER_INSTALLATIONS_MAX_PAGES } from "#/modules/github-app/constants";
import type { GithubFetch, GithubOAuthConfig } from "#/modules/github-app/types";
import { githubHeaders } from "./mint-repo-token";

const OAuthTokenSchema = z.looseObject({ access_token: z.string().min(1) });
const OAuthErrorSchema = z.looseObject({ error: z.string() });
const UserInstallationsSchema = z.looseObject({ installations: z.array(z.looseObject({ id: z.number() })) });

// -----
// GitHub hands the browser a one-time code when a person installs the
// App. Trading it gives a token that acts as that person. It is used
// for one question and then dropped, never stored. GitHub answers 200
// even for a bad code, so the body decides.
// -----
export const exchangeOAuthCode = async (oauth: GithubOAuthConfig, code: string, fetchImpl: GithubFetch = fetch): Promise<string> => {
  const response = await fetchImpl(GITHUB_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "user-agent": "elise-engine" },
    body: JSON.stringify({ client_id: oauth.clientId, client_secret: oauth.clientSecret, code }),
  });
  const json: unknown = await response.json();
  const token = OAuthTokenSchema.safeParse(json);
  if (token.success) return token.data.access_token;
  const failure = OAuthErrorSchema.safeParse(json);
  throw new Error(`GitHub refused the code: ${failure.success ? failure.data.error : response.status}`);
};

// -----
// The installs of the App that this person can use. This is the proof
// that the person who finished the install is allowed to: the number
// in the redirect URL proves nothing, because anyone can change it.
// -----
export const userInstallationIds = async (userToken: string, fetchImpl: GithubFetch = fetch): Promise<number[]> => {
  const ids: number[] = [];
  for (let page = 1; page <= GITHUB_USER_INSTALLATIONS_MAX_PAGES; page++) {
    const response = await fetchImpl(`${GITHUB_API_URL}/user/installations?per_page=100&page=${page}`, { headers: githubHeaders(userToken) });
    if (response.status !== 200) throw new Error(`GitHub could not list the person's installs: ${response.status}`);
    const body = UserInstallationsSchema.safeParse(await response.json());
    if (!body.success) throw new Error("GitHub sent no install list");
    ids.push(...body.data.installations.map((install) => install.id));
    if (body.data.installations.length < 100) break;
  }
  return ids;
};
